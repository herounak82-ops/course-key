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
import { Pencil, Trash2, Loader2, FolderPlus, Upload, Plus, Folder, FileText, Eye } from "lucide-react";
import { KINDS, normaliseRef, STUDY_BUCKET, formatSize } from "@/lib/learning";
import { Breadcrumbs, ViewerDialog, openItem, type Viewer } from "@/components/FreeLearning";

type Crumb = { id: string | null; title: string };
const ROOT = "__root__";

export function LearningTab() {
  const qc = useQueryClient();
  const [path, setPath] = useState<Crumb[]>([{ id: null, title: "Library" }]);
  const [editing, setEditing] = useState<any | null>(null);
  const [mode, setMode] = useState<"folder" | "link" | null>(null);
  const [uploading, setUploading] = useState(false);
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

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h3 className="font-display text-lg font-bold">Learning library</h3>
          <p className="text-xs text-muted-foreground">Study materials, videos and folders</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button size="sm" variant="outline" className="h-10 rounded-lg bg-card" onClick={() => { setEditing(null); setMode("folder"); }}><FolderPlus className="h-4 w-4 mr-1.5" />New folder</Button>
          <Button size="sm" className="h-10 rounded-lg shadow-card" onClick={() => { setEditing(null); setMode("link"); }} disabled={uploading}><Plus className="h-4 w-4 mr-1.5" />Add resource</Button>
        </div>
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
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const isUpload = item?.kind === "upload";
  const [f, setF] = useState({
    title: item?.title ?? "", description: item?.description ?? "",
    kind: item?.kind ?? (mode === "folder" ? "folder" : "upload"), ref: item?.ref ?? "",
    sort_order: item?.sort_order ?? 0, is_published: item?.is_published ?? true,
    parent: (item ? item.parent_id : parentId) ?? ROOT,
  });
  const [saving, setSaving] = useState(false);
  const newUpload = !item && f.kind === "upload";
  const needsRef = f.kind !== "folder" && f.kind !== "upload";

  const save = async () => {
    if (f.title.trim().length < 1 && !newUpload) return toast.error("Name is required");
    if (needsRef && !f.ref.trim()) return toast.error("Link is required");
    if (newUpload && !file) return toast.error("Choose a file to upload");
    setSaving(true);

    let ref = f.kind === "folder" ? (item?.ref ?? "folder") : isUpload ? item.ref : normaliseRef(f.kind, f.ref);
    let mime: string | null = item?.mime_type ?? null;
    let size: number | null = item?.size_bytes ?? null;
    let title = f.title.trim();

    if (newUpload && file) {
      const safe = file.name.replace(/[^\w.\-]+/g, "_");
      const key = `${crypto.randomUUID()}/${safe}`;
      const { error } = await supabase.storage.from(STUDY_BUCKET).upload(key, file, { contentType: file.type || undefined });
      if (error) { setSaving(false); return toast.error(error.message); }
      ref = key;
      mime = file.type || null;
      size = file.size;
      if (!title) title = file.name.replace(/\.[^.]+$/, "");
    }

    const row: any = {
      title, description: f.description || null, kind: f.kind, ref,
      sort_order: Number(f.sort_order) || 0, is_published: f.is_published,
      parent_id: f.parent === ROOT ? null : f.parent,
    };
    if (newUpload) { row.mime_type = mime; row.size_bytes = size; }
    if (!item) row.category = "General";

    const { error } = item
      ? await supabase.from("learning_items").update(row).eq("id", item.id)
      : await supabase.from("learning_items").insert(row);
    if (error) {
      setSaving(false);
      if (newUpload) await supabase.storage.from(STUDY_BUCKET).remove([ref]);
      return toast.error(error.message);
    }
    setSaving(false);
    toast.success("Saved");
    onClose();
  };

  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto rounded-lg border-border bg-card sm:max-w-lg">
      <DialogHeader className="border-b border-border pb-4"><DialogTitle className="font-display text-xl">{item ? "Edit resource" : mode === "folder" ? "New folder" : "Add resource"}</DialogTitle></DialogHeader>
      <div className="space-y-4 py-1">
        {mode !== "folder" && !isUpload && (
          <div className="space-y-1.5"><Label>Resource type</Label>
            <Select value={f.kind} onValueChange={(v) => { setF({ ...f, kind: v }); setFile(null); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{KINDS.filter((k) => k.value !== "folder" && (!item || k.value !== "upload")).map((k) => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        )}
        {newUpload && (
          <div className="space-y-2">
            <Label>File</Label>
            <Button type="button" variant="outline" className="h-auto w-full flex-col gap-1.5 rounded-lg border-dashed bg-secondary/50 py-5 hover:bg-secondary" onClick={() => fileRef.current?.click()} disabled={saving}>
              <Upload className="h-6 w-6 text-primary" />
              <span className="font-semibold text-sm">{file ? "Change file" : "Choose file"}</span>
              <span className="text-xs font-normal text-muted-foreground">Up to 50 MB</span>
            </Button>
            <input ref={fileRef} type="file" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            {file && (
              <div className="flex min-w-0 items-center gap-2 rounded-lg bg-secondary/50 px-3 py-2 text-sm">
                <FileText className="h-4 w-4 shrink-0 text-primary" />
                <span className="truncate">{file.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{formatSize(file.size)}</span>
              </div>
            )}
          </div>
        )}
        {needsRef && (
          <div className="space-y-1.5"><Label>Link or ID</Label>
            <Input value={f.ref} onChange={(e) => setF({ ...f, ref: e.target.value })} placeholder="Paste the Drive / YouTube / web link" />
            {f.kind === "drive_folder" && <p className="text-[11px] text-muted-foreground">The folder must be shared with your service account email.</p>}
          </div>
        )}
        <div className="space-y-1.5"><Label>Name{newUpload && " (optional — uses file name)"}</Label><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} autoFocus={!newUpload} /></div>
        <div className="space-y-1.5"><Label>Inside folder</Label>
          <Select value={f.parent} onValueChange={(v) => setF({ ...f, parent: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ROOT}>Library (top level)</SelectItem>
              {folders.map((fo) => <SelectItem key={fo.id} value={fo.id}>{fo.title}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label>Description (optional)</Label><Textarea rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
        <div className="flex items-center gap-4">
          <div className="w-24 space-y-1.5"><Label>Order</Label><Input type="number" value={f.sort_order} onChange={(e) => setF({ ...f, sort_order: e.target.value as any })} /></div>
          <label className="flex items-center gap-2 mt-6 text-sm"><Switch checked={f.is_published} onCheckedChange={(v) => setF({ ...f, is_published: v })} />Visible</label>
        </div>
      </div>
      <DialogFooter className="border-t border-border pt-4">
        <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}{newUpload ? (saving ? "Uploading…" : "Upload file") : "Save"}</Button>
      </DialogFooter>
    </DialogContent>
  );
}
