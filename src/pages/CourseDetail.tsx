import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { z } from "zod";
import upiQr from "@/assets/upi-qr.png";
import { ArrowLeft, IndianRupee, Loader2, CheckCircle2, Clock, Copy, Smartphone, ExternalLink } from "lucide-react";

const utrSchema = z.string().trim().regex(/^[a-zA-Z0-9]{8,30}$/, "Enter a valid UTR / transaction ID");

export default function CourseDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: course, isLoading } = useQuery({
    queryKey: ["course", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("*").eq("id", id!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: settings } = useQuery({
    queryKey: ["app-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("app_settings").select("upi_id, upi_payee_name").eq("id", 1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: access } = useQuery({
    queryKey: ["access", id, user?.id],
    enabled: !!user && !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_access")
        .select("*")
        .eq("user_id", user!.id)
        .eq("course_id", id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <AppLayout><div className="container px-4 py-6"><Skeleton className="h-72 w-full" /></div></AppLayout>;
  }
  if (!course) {
    return (
      <AppLayout>
        <div className="container px-4 py-10 text-center">
          <p className="text-muted-foreground">Course not found.</p>
          <Button asChild variant="link"><Link to="/courses">Back to courses</Link></Button>
        </div>
      </AppLayout>
    );
  }

  const status = access?.status;
  const upiId = settings?.upi_id ?? "devpanday19932@axl";
  const payeeName = settings?.upi_payee_name ?? "Dev Panday";

  return (
    <AppLayout>
      <div className="container px-4 py-4">
        <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
          <Link to="/courses"><ArrowLeft className="h-4 w-4 mr-1" /> All courses</Link>
        </Button>

        <Card className="overflow-hidden shadow-card">
          {course.thumbnail_url && (
            <img src={course.thumbnail_url} alt={course.title} className="w-full max-h-72 object-cover" />
          )}
          <CardContent className="p-5">
            {course.category && <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{course.category}</p>}
            <h1 className="font-display text-2xl md:text-3xl font-extrabold mt-1">{course.title}</h1>
            <div className="flex items-center gap-2 mt-2">
              <span className="inline-flex items-center text-primary font-bold text-lg">
                <IndianRupee className="h-5 w-5" />{Number(course.price).toLocaleString("en-IN")}
              </span>
              {status === "active" && <Badge className="bg-success text-success-foreground border-0"><CheckCircle2 className="h-3 w-3 mr-1" />Enrolled</Badge>}
              {status === "pending" && <Badge className="bg-warning text-warning-foreground border-0"><Clock className="h-3 w-3 mr-1" />Awaiting verification</Badge>}
            </div>
            {course.description && (
              <p className="mt-4 text-foreground/80 whitespace-pre-wrap text-sm md:text-base">{course.description}</p>
            )}
          </CardContent>
        </Card>

        {/* STATE-DEPENDENT SECTION */}
        <div className="mt-5">
          {status === "active" ? (
            <ActiveSection course={course} />
          ) : status === "pending" ? (
            <PendingSection />
          ) : (
            <PaymentSection
              courseId={course.id}
              price={Number(course.price)}
              title={course.title}
              upiId={upiId}
              payeeName={payeeName}
              onSubmitted={() => qc.invalidateQueries({ queryKey: ["access", id, user?.id] })}
            />
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function PendingSection() {
  return (
    <Card className="border-warning/40 bg-warning/5">
      <CardContent className="p-5 text-center">
        <Clock className="h-10 w-10 mx-auto mb-2 text-warning" />
        <h3 className="font-display font-bold text-lg">Awaiting verification</h3>
        <p className="text-sm text-muted-foreground mt-1">
          We received your payment details. You'll get access as soon as Dev Sir confirms your UPI transaction. Usually within a few hours.
        </p>
      </CardContent>
    </Card>
  );
}

function ActiveSection({ course }: { course: any }) {
  if (!course.youtube_video_id && !course.youtube_playlist_id) {
    return (
      <Card><CardContent className="p-5 text-center text-muted-foreground">
        Course videos will be added soon by your instructor.
      </CardContent></Card>
    );
  }
  // Prefer playlist embed if both provided we still show video player + playlist link
  const embedSrc = course.youtube_playlist_id
    ? `https://www.youtube.com/embed/videoseries?list=${course.youtube_playlist_id}`
    : `https://www.youtube.com/embed/${course.youtube_video_id}`;
  return (
    <Card className="overflow-hidden shadow-card">
      <div className="aspect-video bg-black">
        <iframe
          className="w-full h-full"
          src={embedSrc}
          title={course.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
      <CardContent className="p-4">
        <h3 className="font-display font-bold">Course Lessons</h3>
        <p className="text-xs text-muted-foreground mt-1">
          {course.youtube_playlist_id ? "Full playlist embedded above." : "Video lesson embedded above."}
        </p>
        {course.youtube_playlist_id && (
          <Button asChild variant="outline" size="sm" className="mt-3">
            <a href={`https://www.youtube.com/playlist?list=${course.youtube_playlist_id}`} target="_blank" rel="noreferrer">
              Open on YouTube <ExternalLink className="h-3 w-3 ml-1" />
            </a>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function PaymentSection({ courseId, price, title, upiId, payeeName, onSubmitted }: {
  courseId: string; price: number; title: string; upiId: string; payeeName: string; onSubmitted: () => void;
}) {
  const { user } = useAuth();
  const [utr, setUtr] = useState("");
  const [busy, setBusy] = useState(false);

  const upiLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName)}&am=${price}&cu=INR&tn=${encodeURIComponent("DSP-" + title.slice(0, 30))}`;

  const copy = (txt: string, label: string) => {
    navigator.clipboard.writeText(txt);
    toast.success(`${label} copied`);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return toast.error("Please log in first");
    const v = utrSchema.safeParse(utr);
    if (!v.success) return toast.error(v.error.issues[0].message);
    setBusy(true);
    const { error } = await supabase.from("user_access").insert({
      user_id: user.id,
      course_id: courseId,
      transaction_id: v.data,
      status: "pending",
    });
    setBusy(false);
    if (error) {
      if (error.code === "23505") toast.error("You've already submitted for this course.");
      else toast.error(error.message);
      return;
    }
    toast.success("Submitted! Awaiting verification.");
    setUtr("");
    onSubmitted();
  };

  return (
    <div className="space-y-4">
      <Card className="shadow-card">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Smartphone className="h-5 w-5 text-accent" />
            <h3 className="font-display font-bold text-lg">Step 1 — Pay via UPI</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Scan the QR with any UPI app (PhonePe, GPay, Paytm, BHIM…). Send <span className="font-semibold text-primary">₹{price.toLocaleString("en-IN")}</span> to the UPI ID below.
          </p>

          <div className="grid sm:grid-cols-2 gap-4 items-center">
            <div className="bg-white rounded-xl p-3 border-2 border-primary/10 mx-auto">
              <img src={upiQr} alt="UPI QR for Dev Panday" className="w-44 h-44 object-contain" />
            </div>
            <div className="space-y-2.5 text-sm">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">UPI ID</p>
                <button type="button" onClick={() => copy(upiId, "UPI ID")} className="font-mono font-semibold text-primary inline-flex items-center gap-1.5 hover:underline">
                  {upiId} <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Payee</p>
                <p className="font-semibold">{payeeName}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Amount</p>
                <p className="font-bold text-lg text-primary inline-flex items-center"><IndianRupee className="h-5 w-5" />{price.toLocaleString("en-IN")}</p>
              </div>
              <Button asChild size="sm" className="bg-cta hover:opacity-95 shadow-cta border-0 w-full">
                <a href={upiLink}>Open UPI App</a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardContent className="p-5">
          <h3 className="font-display font-bold text-lg mb-1">Step 2 — Submit transaction ID</h3>
          <p className="text-sm text-muted-foreground mb-4">
            After paying, copy the 12-digit UTR / transaction ID from your UPI app and paste it below.
          </p>
          <form onSubmit={submit} className="space-y-3">
            <div>
              <Label htmlFor="utr">UTR / Transaction ID</Label>
              <Input id="utr" value={utr} onChange={(e) => setUtr(e.target.value)} placeholder="e.g. 412345678901" required />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}I have paid — Submit for verification
            </Button>
          </form>
          <p className="text-[11px] text-muted-foreground mt-3">
            Dev Sir will verify your payment manually. You'll see the course unlock in “My Learning” once approved.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
