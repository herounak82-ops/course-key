import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, Radio, ImageIcon, Wand2 } from "lucide-react";
import { normaliseRef } from "@/lib/learning";

const toLocalInput = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

export function LiveTab() {
  const qc = useQueryClient();
  const [dlg, setDlg] = useState<{ item: any | null } | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-live"],
    queryFn: async () => {
      const { data, error } = await supabase.from("live_sessions").select("*").order("scheduled_at", { ascending: false, nullsFirst: true });
      if (error) throw error;
      return data;
    },
  });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin-live"] }); qc.invalidateQueries({ queryKey: ["live"] }); };
  const del = async (id: string) => {
    if (!confirm("Remove this live class?")) return;
    const { error } = await supabase.from("live_sessions").delete().eq("id", id);
    if (error) return toast.error(error.message);
    refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="font-display text-lg font-bold">Live classes</h3>
          <p className="text-xs text-muted-foreground">Channel lives appear automatically. Add a link here for unlisted or scheduled lives.</p>
        </div>
        <Button size="sm" className="h-10 rounded-lg shadow-card shrink-0" onClick={() => setDlg({ item: null })}><Plus className="h-4 w-4 mr-1.5" />Add live</Button>
      </div>
      {isLoading ? <Skeleton className="h-24" /> : !data?.length ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No manual lives added. Lives from your YouTube channel still show automatically.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {data.map((l) => (
            <Card key={l.id} className="shadow-card">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="h-12 w-20 rounded-md bg-secondary overflow-hidden shrink-0">
                  <img src={l.thumbnail_url || `https://i.ytimg.com/vi/${l.video_id}/hqdefault.jpg`} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{l.title}</p>
                  <div className="flex gap-1.5 items-center mt-0.5">
                    <Badge variant="outline" className="text-[10px]"><Radio className="h-3 w-3 mr-1" />Live</Badge>
                    <span className="text-[11px] text-muted-foreground">{l.scheduled_at ? new Date(l.scheduled_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "No time set"}</span>
                    {!l.is_published && <Badge variant="secondary" className="text-[10px]">Hidden</Badge>}
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setDlg({ item: l })}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => del(l.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Dialog open={!!dlg} onOpenChange={(v) => !v && setDlg(null)}>
        {dlg && <LiveDialog key={dlg.item?.id ?? "new"} item={dlg.item} onClose={() => { setDlg(null); refresh(); }} />}
      </Dialog>
    </div>
  );
}

function LiveDialog({ item, onClose }: { item: any | null; onClose: () => void }) {
  const [f, setF] = useState({
    title: item?.title ?? "", link: item?.video_id ?? "", when: toLocalInput(item?.scheduled_at),
    is_published: item?.is_published ?? true,
  });
  const [thumb, setThumb] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [autoThumb, setAutoThumb] = useState("");
  const autoFetch = async () => {
    const videoId = normaliseRef("yt_video", f.link);
    if (!/^[\w-]{11}$/.test(videoId)) return toast.error("Paste a valid YouTube live link first");
    setFetching(true);
    const { data, error } = await supabase.functions.invoke("youtube-video-info", { body: { videoId } });
    setFetching(false);
    if (error || data?.error) return toast.error(data?.error ?? "Couldn't fetch details");
    setF((p) => ({ ...p, title: p.title || data.title, when: data.scheduledAt ? toLocalInput(data.scheduledAt) : p.when }));
    setAutoThumb(data.thumbnail || "");
    toast.success(data.scheduledAt ? "Title and start time filled in" : "Title filled in — no scheduled time found");
  };

  const save = async () => {
    const video_id = normaliseRef("yt_video", f.link);
    if (!f.title.trim()) return toast.error("Title is required");
    if (!/^[\w-]{11}$/.test(video_id)) return toast.error("Paste a valid YouTube live link");
    setSaving(true);
    let thumbnail_url: string | null = item?.thumbnail_url ?? null;
    if (thumb) {
      const path = `live/${Date.now()}-${thumb.name.replace(/[^\w.\-]+/g, "_")}`;
      const { error } = await supabase.storage.from("course-thumbnails").upload(path, thumb, { contentType: thumb.type });
      if (error) { setSaving(false); return toast.error(error.message); }
      thumbnail_url = supabase.storage.from("course-thumbnails").getPublicUrl(path).data.publicUrl;
    }
    const row = { title: f.title.trim(), video_id, thumbnail_url, scheduled_at: f.when ? new Date(f.when).toISOString() : null, is_published: f.is_published };
    const { error } = item ? await supabase.from("live_sessions").update(row).eq("id", item.id) : await supabase.from("live_sessions").insert(row);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    onClose();
  };

  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto rounded-lg border-border bg-card sm:max-w-lg">
      <DialogHeader className="border-b border-border pb-4"><DialogTitle className="font-display text-xl">{item ? "Edit live" : "Add live"}</DialogTitle></DialogHeader>
      <div className="space-y-4 py-1">
        <div className="space-y-1.5"><Label>YouTube live link</Label>
          <div className="flex gap-2">
            <Input value={f.link} onChange={(e) => setF({ ...f, link: e.target.value })} placeholder="https://youtube.com/live/…  (public or unlisted)" />
            <Button type="button" variant="outline" className="shrink-0" disabled={fetching} onClick={autoFetch}>
              {fetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4 mr-1.5" />}{!fetching && "Auto fetch"}
            </Button>
          </div>
          {autoThumb && !thumb && !item?.thumbnail_url && <img src={autoThumb} alt="" className="mt-2 h-20 rounded-md object-cover" />}
        </div>
        <div className="space-y-1.5"><Label>Title</Label><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Start time (for upcoming lives)</Label>
          <Input type="datetime-local" value={f.when} onChange={(e) => setF({ ...f, when: e.target.value })} />
        </div>
        <div className="space-y-1.5"><Label>Thumbnail (optional)</Label>
          <div className="flex items-center gap-3">
            <div className="h-14 w-24 rounded-md bg-secondary overflow-hidden shrink-0 grid place-items-center text-muted-foreground">
              {thumb ? <img src={URL.createObjectURL(thumb)} className="w-full h-full object-cover" alt="" /> : item?.thumbnail_url ? <img src={item.thumbnail_url} className="w-full h-full object-cover" alt="" /> : <ImageIcon className="h-5 w-5" />}
            </div>
            <Input type="file" accept="image/*" onChange={(e) => setThumb(e.target.files?.[0] ?? null)} />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm"><Switch checked={f.is_published} onCheckedChange={(v) => setF({ ...f, is_published: v })} />Visible</label>
      </div>
      <DialogFooter className="border-t border-border pt-4">
        <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}Save</Button>
      </DialogFooter>
    </DialogContent>
  );
}
