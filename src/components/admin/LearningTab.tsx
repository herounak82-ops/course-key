import { useState } from "react";
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
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { KINDS, normaliseRef } from "@/lib/learning";

export function LearningTab() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any | null>(null);
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-learning"],
    queryFn: async () => {
      const { data, error } = await supabase.from("learning_items").select("*").order("category").order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const del = async (id: string) => {
    if (!confirm("Delete this item?")) return;
    const { error } = await supabase.from("learning_items").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-learning"] });
  };
  const categories = [...new Set((data ?? []).map((d) => d.category))];

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <div>
          <h3 className="font-display font-bold">Free learning ({data?.length ?? 0})</h3>
          <p className="text-xs text-muted-foreground">Shown to everyone in My Learning, grouped by category.</p>
        </div>
        <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4 mr-1" />Add</Button>
      </div>
      {isLoading ? <Skeleton className="h-32" /> : !data?.length ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">Add a Drive folder, playlist or file to get started.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {data.map((i) => (
            <Card key={i.id} className="shadow-card">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{i.title}</p>
                  <div className="flex gap-1.5 mt-1 flex-wrap">
                    <Badge variant="secondary">{i.category}</Badge>
                    <Badge variant="outline">{KINDS.find((k) => k.value === i.kind)?.label.split(" (")[0]}</Badge>
                    {!i.is_published && <Badge variant="outline">Hidden</Badge>}
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => { setEditing(i); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => del(i.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        {open && (
          <ItemDialog key={editing?.id ?? "new"} item={editing} categories={categories}
            onClose={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["admin-learning"] }); }} />
        )}
      </Dialog>
    </div>
  );
}

function ItemDialog({ item, categories, onClose }: { item: any | null; categories: string[]; onClose: () => void }) {
  const [f, setF] = useState({
    title: item?.title ?? "", description: item?.description ?? "", category: item?.category ?? "Study Material",
    kind: item?.kind ?? "drive_folder", ref: item?.ref ?? "", sort_order: item?.sort_order ?? 0, is_published: item?.is_published ?? true,
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (f.title.trim().length < 2 || !f.ref.trim() || !f.category.trim()) return toast.error("Title, category and link are required");
    setSaving(true);
    const row = { ...f, title: f.title.trim(), category: f.category.trim(), ref: normaliseRef(f.kind, f.ref), sort_order: Number(f.sort_order) || 0 };
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
      <DialogHeader><DialogTitle>{item ? "Edit item" : "Add learning item"}</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div><Label>Type</Label>
          <Select value={f.kind} onValueChange={(v) => setF({ ...f, kind: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{KINDS.map((k) => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Title</Label><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
        <div><Label>Category / section</Label>
          <Input list="lcats" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} placeholder="e.g. Banking Notes, Railway Series" />
          <datalist id="lcats">{categories.map((c) => <option key={c} value={c} />)}</datalist>
        </div>
        <div><Label>Link or ID</Label>
          <Input value={f.ref} onChange={(e) => setF({ ...f, ref: e.target.value })} placeholder="Paste the Drive / YouTube link" />
          {f.kind === "drive_folder" && <p className="text-[11px] text-muted-foreground mt-1">The folder must be shared with your service account email.</p>}
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
