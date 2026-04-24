import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { z } from "zod";
import {
  CheckCircle2, ClipboardList, BookOpen, Megaphone, Settings as SettingsIcon,
  Plus, Trash2, Pencil, Loader2, ImageIcon, Upload,
} from "lucide-react";

const courseSchema = z.object({
  title: z.string().trim().min(2, "Title too short").max(120),
  description: z.string().trim().max(4000).optional().or(z.literal("")),
  price: z.coerce.number().min(0).max(1_000_000),
  category: z.string().trim().max(60).optional().or(z.literal("")),
  youtube_video_id: z.string().trim().max(40).optional().or(z.literal("")),
  youtube_playlist_id: z.string().trim().max(60).optional().or(z.literal("")),
  is_published: z.boolean().default(true),
});
const noticeSchema = z.object({
  title: z.string().trim().min(2).max(120),
  body: z.string().trim().min(2).max(4000),
});

export default function Admin() {
  return (
    <AppLayout>
      <section className="bg-hero text-primary-foreground">
        <div className="container px-4 py-7">
          <h1 className="font-display text-2xl md:text-3xl font-extrabold">Admin Dashboard</h1>
          <p className="opacity-85 text-sm mt-1">Verify payments, manage courses, post notices.</p>
        </div>
      </section>

      <section className="container px-4 py-6">
        <Tabs defaultValue="pending">
          <TabsList className="w-full grid grid-cols-4 h-auto">
            <TabsTrigger value="pending" className="py-2.5"><ClipboardList className="h-4 w-4 mr-1.5 hidden sm:inline" />Pending</TabsTrigger>
            <TabsTrigger value="courses" className="py-2.5"><BookOpen className="h-4 w-4 mr-1.5 hidden sm:inline" />Courses</TabsTrigger>
            <TabsTrigger value="notices" className="py-2.5"><Megaphone className="h-4 w-4 mr-1.5 hidden sm:inline" />Notices</TabsTrigger>
            <TabsTrigger value="settings" className="py-2.5"><SettingsIcon className="h-4 w-4 mr-1.5 hidden sm:inline" />Settings</TabsTrigger>
          </TabsList>
          <TabsContent value="pending" className="mt-5"><PendingTab /></TabsContent>
          <TabsContent value="courses" className="mt-5"><CoursesTab /></TabsContent>
          <TabsContent value="notices" className="mt-5"><NoticesTab /></TabsContent>
          <TabsContent value="settings" className="mt-5"><SettingsTab /></TabsContent>
        </Tabs>
      </section>
    </AppLayout>
  );
}

/* ---------- PENDING ---------- */
function PendingTab() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-pending"],
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("user_access")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: true });
      if (error) throw error;
      if (!rows?.length) return [];
      const ids = [...new Set(rows.map((d) => d.user_id))];
      const cids = [...new Set(rows.map((d) => d.course_id))];
      const [{ data: profiles }, { data: courses }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email").in("id", ids),
        supabase.from("courses").select("id, title, price").in("id", cids),
      ]);
      return rows.map((row) => ({
        ...row,
        profile: profiles?.find((p) => p.id === row.user_id) ?? null,
        course: courses?.find((c) => c.id === row.course_id) ?? null,
      }));
    },
  });

  const approve = async (id: string) => {
    const { error } = await supabase
      .from("user_access")
      .update({ status: "active", approved_at: new Date().toISOString(), approved_by: user!.id })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Approved — student can now watch.");
    qc.invalidateQueries({ queryKey: ["admin-pending"] });
  };

  if (isLoading) return <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>;
  if (!data?.length) return <Card><CardContent className="p-8 text-center text-muted-foreground"><CheckCircle2 className="h-10 w-10 mx-auto mb-2 opacity-50" /><p>No pending verifications. 🎉</p></CardContent></Card>;

  return (
    <div className="space-y-3">
      {data.map((row: any) => (
        <Card key={row.id} className="shadow-card hover-lift">
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{row.course?.title ?? "Course"}</p>
              <p className="text-xs text-muted-foreground truncate">
                {row.profile?.full_name ?? "Student"} · {row.profile?.email}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                <Badge variant="secondary">UTR: <span className="font-mono ml-1">{row.transaction_id}</span></Badge>
                <Badge variant="outline">₹{Number(row.course?.price ?? 0).toLocaleString("en-IN")}</Badge>
                <span className="text-muted-foreground">{new Date(row.created_at).toLocaleString("en-IN")}</span>
              </div>
            </div>
            <Button onClick={() => approve(row.id)} className="bg-success hover:bg-success/90 text-success-foreground tap-scale">
              <CheckCircle2 className="h-4 w-4 mr-1.5" /> Approve
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ---------- COURSES ---------- */
function CoursesTab() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any | null>(null);
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-courses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const onDelete = async (id: string) => {
    if (!confirm("Delete this course? Student access records will also be removed.")) return;
    const { error } = await supabase.from("courses").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Course deleted");
    qc.invalidateQueries({ queryKey: ["admin-courses"] });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-display font-bold">All courses ({data?.length ?? 0})</h3>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => setEditing(null)} className="tap-scale"><Plus className="h-4 w-4 mr-1" /> New</Button>
          </DialogTrigger>
          {/* Key forces remount when switching between edit/new — fixes form not repopulating */}
          {open && (
            <CourseDialog
              key={editing?.id ?? "new"}
              course={editing}
              onClose={() => { setOpen(false); setEditing(null); qc.invalidateQueries({ queryKey: ["admin-courses"] }); }}
            />
          )}
        </Dialog>
      </div>
      {isLoading ? <Skeleton className="h-32" /> : !data?.length ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No courses yet.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {data.map((c) => (
            <Card key={c.id} className="shadow-card hover-lift">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="h-14 w-20 rounded-md bg-secondary overflow-hidden shrink-0">
                  {c.thumbnail_url ? <img src={c.thumbnail_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full grid place-items-center text-muted-foreground"><ImageIcon className="h-5 w-5" /></div>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{c.title}</p>
                  <p className="text-xs text-muted-foreground">₹{Number(c.price).toLocaleString("en-IN")} · {c.category || "Uncategorised"}{c.is_published ? "" : " · Draft"}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => { setEditing(c); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => onDelete(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function CourseDialog({ course, onClose }: { course: any | null; onClose: () => void }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    title: course?.title ?? "",
    description: course?.description ?? "",
    price: course?.price ?? 0,
    category: course?.category ?? "",
    youtube_video_id: course?.youtube_video_id ?? "",
    youtube_playlist_id: course?.youtube_playlist_id ?? "",
    is_published: course?.is_published ?? true,
  });
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [thumbPreview, setThumbPreview] = useState<string | null>(course?.thumbnail_url ?? null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!thumbFile) return;
    const url = URL.createObjectURL(thumbFile);
    setThumbPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [thumbFile]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = courseSchema.safeParse(form);
    if (!v.success) return toast.error(v.error.issues[0].message);
    setBusy(true);

    let thumbnail_url: string | null = course?.thumbnail_url ?? null;

    // Upload new thumbnail if file selected
    if (thumbFile) {
      const ext = thumbFile.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user!.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("course-thumbnails")
        .upload(path, thumbFile, { upsert: false, contentType: thumbFile.type });
      if (upErr) {
        setBusy(false);
        return toast.error("Thumbnail upload failed: " + upErr.message);
      }
      thumbnail_url = supabase.storage.from("course-thumbnails").getPublicUrl(path).data.publicUrl;
    }

    const payload: any = {
      title: v.data.title,
      description: v.data.description || null,
      price: v.data.price,
      category: v.data.category || null,
      youtube_video_id: v.data.youtube_video_id || null,
      youtube_playlist_id: v.data.youtube_playlist_id || null,
      is_published: v.data.is_published,
      thumbnail_url,
    };

    const { error } = course
      ? await supabase.from("courses").update(payload).eq("id", course.id)
      : await supabase.from("courses").insert(payload);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(course ? "Course updated" : "Course created");
    onClose();
  };

  return (
    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>{course ? "Edit course" : "New course"}</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
        <div><Label>Category</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Class 10 Maths" /></div>
        <div><Label>Description</Label><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        <div><Label>Price (₹)</Label><Input type="number" min={0} value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} required /></div>

        <div>
          <Label>Thumbnail</Label>
          <div className="flex items-start gap-3 mt-1">
            <div className="h-20 w-28 rounded-md bg-secondary overflow-hidden shrink-0 border">
              {thumbPreview ? (
                <img src={thumbPreview} alt="preview" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full grid place-items-center text-muted-foreground">
                  <ImageIcon className="h-6 w-6" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setThumbFile(e.target.files?.[0] ?? null)}
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                <Upload className="h-3 w-3 inline mr-0.5" />
                Upload an image. {course?.thumbnail_url && !thumbFile ? "Leave empty to keep current." : ""}
              </p>
            </div>
          </div>
        </div>

        <div><Label>YouTube Video ID</Label><Input value={form.youtube_video_id} onChange={(e) => setForm({ ...form, youtube_video_id: e.target.value })} placeholder="e.g. dQw4w9WgXcQ" /></div>
        <div><Label>YouTube Playlist ID (optional)</Label><Input value={form.youtube_playlist_id} onChange={(e) => setForm({ ...form, youtube_playlist_id: e.target.value })} placeholder="PLxxxx…" />
          <p className="text-[11px] text-muted-foreground mt-1">If a playlist ID is set, the player shows the full playlist instead of a single video.</p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} />
          Published (visible to students)
        </label>
        <DialogFooter>
          <Button type="submit" disabled={busy} className="tap-scale">{busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{course ? "Save" : "Create"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

/* ---------- NOTICES ---------- */
function NoticesTab() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-notices"],
    queryFn: async () => {
      const { data, error } = await supabase.from("notices").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = noticeSchema.safeParse({ title, body });
    if (!v.success) return toast.error(v.error.issues[0].message);
    setBusy(true);
    let image_url: string | null = null;
    if (file) {
      const ext = file.name.split(".").pop();
      const path = `${user!.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("notices").upload(path, file, { upsert: false });
      if (upErr) { setBusy(false); return toast.error(upErr.message); }
      image_url = supabase.storage.from("notices").getPublicUrl(path).data.publicUrl;
    }
    const { error } = await supabase.from("notices").insert({ ...v.data, image_url, created_by: user!.id });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Notice posted");
    setTitle(""); setBody(""); setFile(null);
    qc.invalidateQueries({ queryKey: ["admin-notices"] });
    qc.invalidateQueries({ queryKey: ["notices"] });
  };

  const del = async (id: string) => {
    if (!confirm("Delete this notice?")) return;
    const { error } = await supabase.from("notices").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["admin-notices"] });
    qc.invalidateQueries({ queryKey: ["notices"] });
  };

  return (
    <div className="space-y-5">
      <Card className="shadow-card">
        <CardContent className="p-4">
          <h3 className="font-display font-bold mb-3">Post a notice</h3>
          <form onSubmit={submit} className="space-y-3">
            <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
            <div><Label>Body</Label><Textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} required /></div>
            <div><Label>Image (optional)</Label><Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></div>
            <Button type="submit" disabled={busy} className="bg-cta hover:opacity-95 shadow-cta border-0 tap-scale">
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Publish
            </Button>
          </form>
        </CardContent>
      </Card>

      <div>
        <h3 className="font-display font-bold mb-3">All notices</h3>
        {isLoading ? <Skeleton className="h-24" /> : !data?.length ? (
          <Card><CardContent className="p-6 text-center text-muted-foreground">No notices yet.</CardContent></Card>
        ) : (
          <div className="space-y-2">
            {data.map((n) => (
              <Card key={n.id} className="shadow-card hover-lift">
                <CardContent className="p-4 flex gap-3">
                  {n.image_url && <img src={n.image_url} alt="" className="h-16 w-16 rounded object-cover" />}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{n.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{n.body}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString("en-IN")}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => del(n.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- SETTINGS ---------- */
function SettingsTab() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("app_settings").select("*").eq("id", 1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const [form, setForm] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const current = form ?? data;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!current) return;
    setBusy(true);
    const { error } = await supabase.from("app_settings").update({
      upi_id: current.upi_id,
      upi_payee_name: current.upi_payee_name,
      contact_phone: current.contact_phone || null,
      contact_email: current.contact_email || null,
      address: current.address || null,
      map_embed_url: current.map_embed_url || null,
      youtube_url: current.youtube_url || null,
      facebook_url: current.facebook_url || null,
      instagram_url: current.instagram_url || null,
    }).eq("id", 1);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Settings saved");
    qc.invalidateQueries({ queryKey: ["admin-settings"] });
    qc.invalidateQueries({ queryKey: ["app-settings"] });
    qc.invalidateQueries({ queryKey: ["app-settings-home"] });
  };

  if (isLoading || !current) return <Skeleton className="h-40" />;

  const update = (patch: Partial<typeof current>) => setForm({ ...current, ...patch });

  return (
    <Card className="shadow-card max-w-2xl">
      <CardContent className="p-5">
        <h3 className="font-display font-bold mb-3">Centre settings</h3>
        <form onSubmit={save} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><Label>UPI ID</Label><Input value={current.upi_id} onChange={(e) => update({ upi_id: e.target.value })} required /></div>
            <div><Label>Payee Name</Label><Input value={current.upi_payee_name} onChange={(e) => update({ upi_payee_name: e.target.value })} required /></div>
            <div><Label>Contact Email</Label><Input type="email" value={current.contact_email ?? ""} onChange={(e) => update({ contact_email: e.target.value })} /></div>
            <div><Label>Contact Phone</Label><Input value={current.contact_phone ?? ""} onChange={(e) => update({ contact_phone: e.target.value })} /></div>
          </div>
          <div><Label>Address</Label><Textarea rows={2} value={current.address ?? ""} onChange={(e) => update({ address: e.target.value })} placeholder="Full centre address shown on Home page" /></div>
          <div>
            <Label>Google Maps Embed URL</Label>
            <Input value={current.map_embed_url ?? ""} onChange={(e) => update({ map_embed_url: e.target.value })} placeholder="https://www.google.com/maps/embed?pb=…" />
            <p className="text-[11px] text-muted-foreground mt-1">From Google Maps → Share → Embed a map → copy the URL inside src="…".</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div><Label>YouTube URL</Label><Input value={current.youtube_url ?? ""} onChange={(e) => update({ youtube_url: e.target.value })} placeholder="https://youtube.com/@…" /></div>
            <div><Label>Facebook URL</Label><Input value={current.facebook_url ?? ""} onChange={(e) => update({ facebook_url: e.target.value })} placeholder="https://facebook.com/…" /></div>
            <div><Label>Instagram URL</Label><Input value={current.instagram_url ?? ""} onChange={(e) => update({ instagram_url: e.target.value })} placeholder="https://instagram.com/…" /></div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Seeded admin email: <span className="font-mono">{current.admin_seed_email}</span>. Hardcoded admins: <span className="font-mono">yrounsk@gmail.com</span>, <span className="font-mono">devsharma19932@gmail.com</span>, phones <span className="font-mono">+919871868560</span>, <span className="font-mono">+918979073262</span>.
          </p>
          <Button type="submit" disabled={busy} className="tap-scale">{busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save</Button>
        </form>
      </CardContent>
    </Card>
  );
}
