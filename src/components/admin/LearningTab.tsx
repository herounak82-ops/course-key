import { useRef, useState } from "react";
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
import { Pencil, Trash2, Loader2, FolderPlus, Upload, Link2, Folder, FileText, Eye } from "lucide-react";
import { KINDS, LINK_KINDS, normaliseRef, STUDY_BUCKET, formatSize } from "@/lib/learning";
import { Breadcrumbs, ViewerDialog, openItem, type Viewer } from "@/components/FreeLearning";

type Crumb = { id: string | null; title: string };
const ROOT = "__root__";

export function LearningTab() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [path, setPath] = useState<Crumb[]>([{ id: null, title: "Library" }]);
  const [editing, setEditing] = useState<any | null>(null);
  const [mode, setMode] = useState<"folder" | "link" | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [viewer, setViewer] = useState<Viewer>(null);
  const current = path[path.length - 1].id;

  const { data, isLoading } = useQuery({
    queryKey: ["admin-learning"],
    queryFn: async () => {
      const { data, error } = await supabase.from("learning_items").select("*").order("sort_order").order("title");
      if (error) throw error;
      return data;
    },
  });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin-learning"] }); qc.invalidateQueries({ queryKey: ["learning-items"] }); };
  const items = (data ?? []).filter((d: any) => (d.parent_id ?? null) === current)
    .sort((a: any, b: any) => Number(b.kind === "folder") - Number(a.kind === "folder"));
  const folders = (data ?? []).filter((d: any) => d.kind === "folder");

  const collectUploads = (id: string): string[] => {
    const all = data ?? [];
    const self = all.find((d: any) => d.id === id);
    const kids = all.filter((d: any) => d.parent_id === id).flatMap((k: any) => collectUploads(k.id));
    return [...(self?.kind === "upload" ? [self.ref] : []), ...kids];
  };

  const del = async (item: any) => {
    if (!confirm(item.kind === "folder" ? `Delete folder "${item.title}" and everything inside?` : `Delete "${item.title}"?`)) return;
    const paths = collectUploads(item.id);
    const { error } = await supabase.from("learning_items").delete().eq("id", item.id);
    if (error) return toast.error(error.message);
    if (paths.length) await supabase.storage.from(STUDY_BUCKET).remove(paths);
    refresh();
  };

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    let ok = 0;
    for (const file of Array.from(files)) {
      setUploading(file.name);
      const safe = file.name.replace(/[^\w.\-]+/g, "_");
      const key = `${crypto.randomUUID()}/${safe}`;
      const { error } = await supabase.storage.from(STUDY_BUCKET).upload(key, file, { contentType: file.type || undefined });
      if (error) { toast.error(`${file.name}: ${error.message}`); continue; }
      const { error: e2 } = await supabase.from("learning_items").insert({
        title: file.name.replace(/\.[^.]+$/, ""), kind: "upload", ref: key, parent_id: current,
        mime_type: file.type || null, size_bytes: file.size, category: "General",
      });
      if (e2) { toast.error(e2.message); await supabase.storage.from(STUDY_BUCKET).remove([key]); continue; }
      ok++;
    }
    setUploading(null);
    if (fileRef.current) fileRef.current.value = "";
    if (ok) toast.success(`Uploaded ${ok} file${ok > 1 ? "s" : ""}`);
    refresh();
  };

  return (
    <div className="space-y-3">
      <div>
        <h3 className="font-display font-bold">Learning library</h3>
        <p className="text-xs text-muted-foreground">Create folders, upload files (up to 50 MB each), or add Drive / YouTube / other links. Shown in My Learning.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => { setEditing(null); setMode("folder"); }}><FolderPlus className="h-4 w-4 mr-1" />New folder</Button>
        <Button size="sm" onClick={() => fileRef.current?.click()} disabled={!!uploading}>
          {uploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
          {uploading ? `Uploading ${uploading.slice(0, 18)}…` : "Upload files"}
        </Button>
        <Button size="sm" variant="outline" onClick={() => { setEditing(null); setMode("link"); }}><Link2 className="h-4 w-4 mr-1" />Add link / video</Button>
        <input ref={fileRef} type="file" multiple hidden onChange={(e) => upload(e.target.files)} />
      </div>
      <Breadcrumbs path={path} onJump={(i) => setPath(path.slice(0, i + 1))} />
      {isLoading ? <Skeleton className="h-32" /> : !items.length ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground text-sm">This folder is empty. Add a folder, upload files or add a link.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {items.map((i: any) => (
            <Card key={i.id} className="shadow-card">
              <CardContent className="p-3 flex items-center gap-3">
                <button className="flex-1 min-w-0 flex items-center gap-3 text-left"
                  onClick={() => i.kind === "folder" ? setPath([...path, { id: i.id, title: i.title }]) : openItem(i, setViewer)}>
                  <div className={`h-10 w-10 rounded-lg grid place-items-center shrink-0 ${i.kind === "folder" ? "bg-accent/15 text-accent" : "bg-primary/10 text-primary"}`}>
                    {i.kind === "folder" ? <Folder className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{i.title}</p>
                    <div className="flex gap-1.5 mt-0.5 flex-wrap items-center">
                      <Badge variant="outline" className="text-[10px]">{KINDS.find((k) => k.value === i.kind)?.label.split(" (")[0]}</Badge>
                      {i.size_bytes ? <span className="text-[11px] text-muted-foreground">{formatSize(i.size_bytes)}</span> : null}
                      {i.kind === "folder" && <span className="text-[11px] text-muted-foreground">{(data ?? []).filter((d: any) => d.parent_id === i.id).length} items</span>}
                      {!i.is_published && <Badge variant="secondary" className="text-[10px]">Hidden</Badge>}
                    </div>
                  </div>
                </button>
                {i.kind !== "folder" && <Button variant="ghost" size="icon" onClick={() => openItem(i, setViewer)}><Eye className="h-4 w-4" /></Button>}
                <Button variant="ghost" size="icon" onClick={() => { setEditing(i); setMode(i.kind === "folder" ? "folder" : "link"); }}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => del(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Dialog open={!!mode} onOpenChange={(v) => !v && setMode(null)}>
        {mode && (
          <ItemDialog key={editing?.id ?? mode} mode={mode} item={editing} parentId={current}
            folders={folders.filter((f: any) => f.id !== editing?.id)}
            onClose={() => { setMode(null); refresh(); }} />
        )}
      </Dialog>
      <ViewerDialog viewer={viewer} onClose={() => setViewer(null)} />
    </div>
  );
}

function ItemDialog({ mode, item, parentId, folders, onClose }: { mode: "folder" | "link"; item: any | null; parentId: string | null; folders: any[]; onClose: () => void }) {
  const isUpload = item?.kind === "upload";
  const [f, setF] = useState({
    title: item?.title ?? "", description: item?.description ?? "",
    kind: item?.kind ?? (mode === "folder" ? "folder" : "yt_video"), ref: item?.ref ?? "",
    sort_order: item?.sort_order ?? 0, is_published: item?.is_published ?? true,
    parent: (item ? item.parent_id : parentId) ?? ROOT,
  });
  const [saving, setSaving] = useState(false);
  const needsRef = f.kind !== "folder" && !isUpload;

  const save = async () => {
    if (f.title.trim().length < 1) return toast.error("Name is required");
    if (needsRef && !f.ref.trim()) return toast.error("Link is required");
    setSaving(true);
    const row: any = {
      title: f.title.trim(), description: f.description || null, kind: f.kind,
      ref: f.kind === "folder" ? (item?.ref ?? "folder") : isUpload ? item.ref : normaliseRef(f.kind, f.ref),
      sort_order: Number(f.sort_order) || 0, is_published: f.is_published,
      parent_id: f.parent === ROOT ? null : f.parent,
    };
    if (!item) row.category = "General";
    const { error } = item
      ? await supabase.from("learning_items").update(row).eq("id", item.id)
      : await supabase.from("learning_items").insert(row);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    onClose();
  };

  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>{item ? "Edit" : mode === "folder" ? "New folder" : "Add link / video"}</DialogTitle></DialogHeader>
      <div className="space-y-3">
        {needsRef && (
          <div><Label>Type</Label>
            <Select value={f.kind} onValueChange={(v) => setF({ ...f, kind: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{LINK_KINDS.map((k) => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        )}
        <div><Label>Name</Label><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} autoFocus /></div>
        {needsRef && (
          <div><Label>Link or ID</Label>
            <Input value={f.ref} onChange={(e) => setF({ ...f, ref: e.target.value })} placeholder="Paste the Drive / YouTube / web link" />
            {f.kind === "drive_folder" && <p className="text-[11px] text-muted-foreground mt-1">The folder must be shared with your service account email.</p>}
          </div>
        )}
        <div><Label>Inside folder</Label>
          <Select value={f.parent} onValueChange={(v) => setF({ ...f, parent: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ROOT}>Library (top level)</SelectItem>
              {folders.map((fo) => <SelectItem key={fo.id} value={fo.id}>{fo.title}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div><Label>Description (optional)</Label><Textarea rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
        <div className="flex items-center gap-4">
          <div className="w-24"><Label>Order</Label><Input type="number" value={f.sort_order} onChange={(e) => setF({ ...f, sort_order: e.target.value as any })} /></div>
          <label className="flex items-center gap-2 mt-5 text-sm"><Switch checked={f.is_published} onCheckedChange={(v) => setF({ ...f, is_published: v })} />Visible</label>
        </div>
      </div>
      <DialogFooter><Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Save</Button></DialogFooter>
    </DialogContent>
  );
}
