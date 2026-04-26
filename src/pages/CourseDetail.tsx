import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  IndianRupee,
  CheckCircle2,
  Clock,
  ExternalLink,
  ShoppingCart,
  PlayCircle,
  BookOpen,
} from "lucide-react";

export default function CourseDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const nav = useNavigate();

  const { data: course, isLoading } = useQuery({
    queryKey: ["course", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
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
    return (
      <AppLayout>
        <div className="container px-4 py-6">
          <Skeleton className="h-72 w-full" />
        </div>
      </AppLayout>
    );
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

  return (
    <AppLayout>
      <div className="container px-4 py-4">
        <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
          <Link to="/courses"><ArrowLeft className="h-4 w-4 mr-1" /> All courses</Link>
        </Button>

        <Card className="overflow-hidden shadow-card animate-fade-in">
          {course.thumbnail_url ? (
            <img src={course.thumbnail_url} alt={course.title} className="w-full max-h-72 object-cover" />
          ) : (
            <div className="w-full h-48 bg-hero grid place-items-center">
              <BookOpen className="h-16 w-16 text-primary-foreground/40" />
            </div>
          )}
          <CardContent className="p-5">
            {course.category && <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{course.category}</p>}
            <h1 className="font-display text-2xl md:text-3xl font-extrabold mt-1">{course.title}</h1>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
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

        <div className="mt-5">
          {status === "active" ? (
            <ActiveSection course={course} />
          ) : status === "pending" ? (
            <PendingSection />
          ) : (
            <EnrollSection courseId={course.id} price={Number(course.price)} onEnroll={() => nav(`/courses/${course.id}/checkout`)} />
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function PendingSection() {
  return (
    <Card className="border-warning/40 bg-warning/5 animate-fade-in">
      <CardContent className="p-5 text-center">
        <Clock className="h-10 w-10 mx-auto mb-2 text-warning animate-pulse-glow rounded-full" />
        <h3 className="font-display font-bold text-lg">Awaiting verification</h3>
        <p className="text-sm text-muted-foreground mt-1">
          We received your payment details. You'll get access as soon as Dev Sir confirms your UPI transaction. Usually within a few hours.
        </p>
      </CardContent>
    </Card>
  );
}

function EnrollSection({ courseId, price, onEnroll }: { courseId: string; price: number; onEnroll: () => void }) {
  return (
    <Card className="shadow-card animate-fade-in hover-lift">
      <CardContent className="p-5 md:p-6 text-center">
        <div className="h-14 w-14 rounded-full bg-cta grid place-items-center mx-auto shadow-cta mb-3">
          <ShoppingCart className="h-7 w-7 text-white" />
        </div>
        <h3 className="font-display font-bold text-xl">Ready to enroll?</h3>
        <p className="text-sm text-muted-foreground mt-1 mb-4">
          Pay once via UPI · Full course access · Secure checkout
        </p>
        <Button
          size="lg"
          className="w-full md:w-auto md:px-12 bg-cta hover:opacity-95 shadow-cta border-0 h-12 tap-scale"
          onClick={onEnroll}
        >
          Enroll Now · <IndianRupee className="h-4 w-4 ml-1" />{price.toLocaleString("en-IN")}
        </Button>
        <p className="text-[11px] text-muted-foreground mt-3">
          Apply coupons on the next step.
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
  const embedSrc = course.youtube_playlist_id
    ? `https://www.youtube.com/embed/videoseries?list=${course.youtube_playlist_id}`
    : `https://www.youtube.com/embed/${course.youtube_video_id}`;
  return (
    <Card className="overflow-hidden shadow-card animate-fade-in">
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
        <h3 className="font-display font-bold inline-flex items-center gap-2">
          <PlayCircle className="h-5 w-5 text-accent" />
          Course Lessons
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          {course.youtube_playlist_id ? "Full playlist embedded above." : "Video lesson embedded above."}
        </p>
        {course.youtube_playlist_id && (
          <Button asChild variant="outline" size="sm" className="mt-3 hover-lift">
            <a href={`https://www.youtube.com/playlist?list=${course.youtube_playlist_id}`} target="_blank" rel="noreferrer">
              Open on YouTube <ExternalLink className="h-3 w-3 ml-1" />
            </a>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
