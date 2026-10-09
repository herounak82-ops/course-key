import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ChevronRight, FileUp, Folder, FolderPlus, Home, Loader2, Pencil, Plus, Trash2, Upload, ExternalLink } from "lucide-react";
import { KINDS, normaliseRef, STUDY_BUCKET } from "@/lib/learning";

const MAX_FILE_SIZE = 25 * 1024 * 1024;
type Item = { id: string; title: string; description: string | null; category: string; kind: string; ref: string; parent_id: string | null; mime_type: string | null; size_bytes: number | null; sort_order: number; is_published: boolean };

type FormState = { title: string; description: string; kind: string; ref: string; parent_id: string | null; sort_order: number; is_published: boolean; mime_type?: string | null; size_bytes?: number | null };

export function LearningTab() {
  const qc = useQueryClient();
  const [folderId, setFolderId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<"item" | "folder" | null>(null);
  const [editing, setEditing] = useState<Item | null>(null);
  const [path, setPath] = useState<Item[]>([]);
  const { data, isLoading } = useQuery<Item[]>({
    queryKey: ["admin-learning"],
    queryFn: async () => { const { data, error } = await supabase.from("learning_items").select("*").order("sort_order").order("title"); if (error) throw error; return data as Item[]; },
  });
  const items = useMemo(() => data ?? [], [data]);
  const currentItems = items.filter((i) => i.parent_id === folderId);
  const folders = items.filter((i) => i.kind === "folder");
  const descendants = useMemo(() => {
    const result = new Set<string>();
    const visit = (id: string) => items.filter((i) => i.parent_id === id).forEach((i) => { result.add(i.id); if (i.kind === "folder") visit(i.id); });
    if (editing?.kind === "folder") visit(editing.id);
    return result;
  }, [editing, items]);
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-learning"] });

  const openFolder = (folder: Item) => { setFolderId(folder.id); setPath([...path, folder]); };
  const jump = (index: number) => { const next = path.slice(0, index); setPath(next); setFolderId(next.at(-1)?.id ?? null); };
  const startEdit = (item: Item) => { setEditing(item); setDialog("item"); };
  const startNew = (kind: "folder" | "item") => { setEditing(null); setDialog(kind); };

  const remove = async (item: Item) => {
    const hasChildren = item.kind === "folder" && items.some((i) => i.parent_id === item.id);
    const warning = hasChildren ? "This folder contains items. Delete the folder and everything inside it?" : `Delete “${item.title}”?`;
    if (!window.confirm(warning)) return;
    if (item.kind === "upload") { const { error } = await supabase.storage.from(STUDY_BUCKET).remove([item.ref]); if (error) return toast.error(`Storage delete failed: ${error.message}`); }
    const { error } = await supabase.from("learning_items").delete().eq("id", item.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted"); refresh();
  };

  if (isLoading) return <Skeleton className="h-40" />;
  return <div>
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
      <div><h3 className="font-display font-bold">Learning library ({items.length})</h3><p className="text-xs text-muted-foreground">Organize study material into folders and publish only when ready.</p></div>
      <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => startNew("folder")}><FolderPlus className="h-4 w-4 mr-1" />New folder</Button><Button size="sm" onClick={() => startNew("item")}><Plus className="h-4 w-4 mr-1" />Add resource</Button></div>
    </div>
    <nav className="flex items-center gap-1 text-sm overflow-x-auto border-b pb-2 mb-3">
      <button onClick={() => jump(0)} className="flex items-center gap-1 px-2 py-1 rounded hover:bg-secondary"><Home className="h-3.5 w-3.5" />All material</button>
      {path.map((p, i) => <span key={p.id} className="flex items-center gap-1 shrink-0"><ChevronRight className="h-4 w-4 text-muted-foreground" /><button onClick={() => jump(i + 1)} className="px-2 py-1 rounded hover:bg-secondary font-semibold">{p.title}</button></span>)}
    </nav>
    {!currentItems.length ? <Card><CardContent className="p-8 text-center text-muted-foreground">This folder is empty. Add a folder or resource.</CardContent></Card> : <div className="space-y-2">
      {currentItems.map((item) => <Card key={item.id} className="shadow-card"><CardContent className="p-3 flex items-center gap-3">
        <div className={`h-10 w-10 rounded-lg grid place-items-center shrink-0 ${item.kind === "folder" ? "bg-accent/15 text-accent" : "bg-primary/10 text-primary"}`}>{item.kind === "folder" ? <Folder className="h-5 w-5" /> : item.kind === "upload" ? <FileUp className="h-5 w-5" /> : <ExternalLink className="h-5 w-5" />}</div>
        <div className="flex-1 min-w-0"><p className="font-semibold truncate">{item.title}</p><div className="flex gap-1.5 mt-1 flex-wrap"><Badge variant="outline">{KINDS.find((k) => k.value === item.kind)?.label ?? item.kind}</Badge>{!item.is_published && <Badge variant="secondary">Hidden</Badge>}{item.kind === "upload" && item.size_bytes ? <Badge variant="secondary">{Math.round(item.size_bytes / 1024)} KB</Badge> : null}</div></div>
        {item.kind === "folder" && <Button variant="outline" size="sm" onClick={() => openFolder(item)}>Open<ChevronRight className="h-4 w-4 ml-1" /></Button>}
        <Button variant="ghost" size="icon" aria-label={`Edit ${item.title}`} onClick={() => startEdit(item)}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" aria-label={`Delete ${item.title}`} onClick={() => remove(item)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
      </CardContent></Card>)}
    </div>}
    <Dialog open={!!dialog} onOpenChange={(v) => !v && setDialog(null)}><DialogContent className="max-h-[90vh] overflow-y-auto">{dialog === "folder" ? <FolderDialog parentId={folderId} onClose={() => { setDialog(null); refresh(); }} /> : dialog === "item" ? <ItemDialog item={editing} parentId={folderId} folders={folders.filter((f) => f.id !== editing?.id && !descendants.has(f.id))} onClose={() => { setDialog(null); setEditing(null); refresh(); }} /> : null}</DialogContent></Dialog>
  </div>;
}

function FolderDialog({ parentId, onClose }: { parentId: string | null; onClose: () => void }) {
  const [title, setTitle] = useState(""); const [saving, setSaving] = useState(false);
  const save = async () => { if (title.trim().length < 2) return toast.error("Folder name must be at least 2 characters"); setSaving(true); const { error } = await supabase.from("learning_items").insert({ title: title.trim(), category: "Study Material", kind: "folder", ref: `folder:${crypto.randomUUID()}`, parent_id: parentId, is_published: true }); setSaving(false); if (error) return toast.error(error.message); toast.success("Folder created"); onClose(); };
  return <><DialogHeader><DialogTitle>New folder</DialogTitle></DialogHeader><div className="space-y-3"><div><Label>Folder name</Label><Input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Mathematics" /></div><p className="text-xs text-muted-foreground">Folders can contain more folders and any supported learning resource.</p></div><DialogFooter><Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Create folder</Button></DialogFooter></>;
}

function ItemDialog({ item, parentId, folders, onClose }: { item: Item | null; parentId: string | null; folders: Item[]; onClose: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null); const [uploading, setUploading] = useState(false); const [saving, setSaving] = useState(false);
  const [f, setF] = useState<FormState>({ title: item?.title ?? "", description: item?.description ?? "", kind: item?.kind ?? "link", ref: item?.ref ?? "", parent_id: item?.parent_id ?? parentId, sort_order: item?.sort_order ?? 0, is_published: item?.is_published ?? true, mime_type: item?.mime_type, size_bytes: item?.size_bytes });
  const update = (p: Partial<FormState>) => setF((v) => ({ ...v, ...p }));
  const pickFile = async (file?: File) => { if (!file) return; if (file.size > MAX_FILE_SIZE) return toast.error("Files must be 25 MB or smaller"); setUploading(true); const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_"); const path = `${crypto.randomUUID()}-${safe}`; const { error } = await supabase.storage.from(STUDY_BUCKET).upload(path, file, { contentType: file.type || "application/octet-stream", upsert: false }); if (error) { setUploading(false); return toast.error(`Upload failed: ${error.message}`); } update({ kind: "upload", ref: path, title: f.title || file.name, mime_type: file.type || "application/octet-stream", size_bytes: file.size }); setUploading(false); toast.success("File uploaded; save to add it to the library"); };
  const save = async () => { if (f.title.trim().length < 2) return toast.error("Title must be at least 2 characters"); if (f.kind !== "upload" && !f.ref.trim()) return toast.error("Add a URL or resource ID"); setSaving(true); const row = { title: f.title.trim(), description: f.description.trim() || null, kind: f.kind, ref: f.kind === "upload" ? f.ref : normaliseRef(f.kind, f.ref), parent_id: f.parent_id, category: "Study Material", sort_order: Number(f.sort_order) || 0, is_published: f.is_published, ...(f.kind === "upload" ? { mime_type: f.mime_type ?? null, size_bytes: f.size_bytes ?? null } : {}) }; const result = item ? await supabase.from("learning_items").update(row).eq("id", item.id) : await supabase.from("learning_items").insert(row); setSaving(false); if (result.error) return toast.error(result.error.message); toast.success("Resource saved"); onClose(); };
  return <><DialogHeader><DialogTitle>{item ? "Edit learning resource" : "Add learning resource"}</DialogTitle></DialogHeader><div className="space-y-3"><div><Label>Resource type</Label><Select value={f.kind} onValueChange={(v) => update({ kind: v, ref: v === "upload" ? f.ref : "" })} disabled={!!item}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{KINDS.filter((k) => k.value !== "folder").map((k) => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}</SelectContent></Select></div><div><Label>Title</Label><Input value={f.title} onChange={(e) => update({ title: e.target.value })} /></div><div><Label>Containing folder</Label><Select value={f.parent_id ?? "root"} onValueChange={(v) => update({ parent_id: v === "root" ? null : v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="root">All material (root)</SelectItem>{folders.map((x) => <SelectItem key={x.id} value={x.id}>{x.title}</SelectItem>)}</SelectContent></Select></div>{f.kind === "upload" ? <div><Label>File</Label><div className="flex gap-2"><Input value={f.ref ? "Uploaded file ready" : "No file selected"} readOnly /><Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>{uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}Choose</Button></div><input ref={fileRef} type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.txt,.mp4,.mp3" onChange={(e) => pickFile(e.target.files?.[0])} /><p className="text-[11px] text-muted-foreground mt-1">PDFs, images, Office files, text, audio and video up to 25 MB.</p></div> : <div><Label>{f.kind === "link" ? "URL" : "URL or ID"}</Label><Input value={f.ref} onChange={(e) => update({ ref: e.target.value })} placeholder="Paste the Drive, YouTube or external link" /></div>}<div><Label>Description (optional)</Label><Textarea rows={2} value={f.description} onChange={(e) => update({ description: e.target.value })} /></div><div className="flex items-center gap-4"><div className="w-24"><Label>Order</Label><Input type="number" value={f.sort_order} onChange={(e) => update({ sort_order: Number(e.target.value) })} /></div><label className="flex items-center gap-2 mt-5 text-sm"><Switch checked={f.is_published} onCheckedChange={(v) => update({ is_published: v })} />Published</label></div></div><DialogFooter><Button onClick={save} disabled={saving || uploading || (f.kind === "upload" && !f.ref)}>{saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Save resource</Button></DialogFooter></>;
}
