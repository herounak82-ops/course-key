import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import teacherStudents from "@/assets/teacher-students.jpg";
import teacherBoard from "@/assets/teacher-board.jpg";
import teacherPortrait from "@/assets/teacher-portrait.jpg";
import { ArrowRight, BookOpen, GraduationCap, Megaphone, Sparkles } from "lucide-react";

export default function Home() {
  const { data: notices, isLoading } = useQuery({
    queryKey: ["notices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notices")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  return (
    <AppLayout>
      {/* HERO */}
      <section className="relative bg-hero text-primary-foreground overflow-hidden">
        <div className="absolute inset-0 opacity-25">
          <img src={teacherStudents} alt="" aria-hidden className="w-full h-full object-cover" />
        </div>
        <div className="relative container px-4 py-10 md:py-20 grid md:grid-cols-2 gap-8 items-center">
          <div>
            <Badge className="bg-accent/90 text-accent-foreground border-0 mb-3">
              <Sparkles className="h-3 w-3 mr-1" /> India's trusted local coaching
            </Badge>
            <h1 className="font-display text-3xl md:text-5xl font-extrabold leading-tight">
              Learn smarter with <span className="text-accent">Dev Sharma</span>
            </h1>
            <p className="mt-3 md:text-lg opacity-90 max-w-xl">
              K-12, BCom/BSc/BA, banking & competitive exam prep — taught with the clarity that comes from a decade in the classroom.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-cta hover:opacity-95 shadow-cta border-0">
                <Link to="/courses">Browse Courses <ArrowRight className="h-4 w-4 ml-1" /></Link>
              </Button>
              <Button asChild size="lg" variant="secondary" className="bg-white/10 hover:bg-white/20 text-primary-foreground border-white/20">
                <Link to="/my-learning">My Learning</Link>
              </Button>
            </div>
            <div className="mt-6 flex items-center gap-3">
              <img src={teacherPortrait} alt="Dayaram (Dev) Sharma" className="h-12 w-12 rounded-full object-cover ring-2 ring-white/30" />
              <div className="text-sm">
                <p className="font-semibold">Dayaram “Dev” Sharma</p>
                <p className="opacity-80 text-xs">Founder · Dev Study Point</p>
              </div>
            </div>
          </div>
          <div className="hidden md:block">
            <img src={teacherBoard} alt="Dev Sharma teaching limits and calculus on whiteboard" className="rounded-2xl shadow-elevated object-cover w-full aspect-square" />
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="container px-4 -mt-6 relative z-10">
        <div className="grid grid-cols-3 gap-3 md:gap-4">
          {[
            { label: "Years teaching", value: "10+" },
            { label: "Students taught", value: "1000+" },
            { label: "Subjects", value: "20+" },
          ].map((s) => (
            <Card key={s.label} className="shadow-card border-0 bg-card">
              <CardContent className="p-3 md:p-4 text-center">
                <p className="font-display font-extrabold text-xl md:text-3xl text-primary">{s.value}</p>
                <p className="text-[11px] md:text-sm text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* NOTICE BOARD */}
      <section className="container px-4 py-8">
        <div className="flex items-center gap-2 mb-4">
          <Megaphone className="h-5 w-5 text-accent" />
          <h2 className="font-display text-xl md:text-2xl font-bold">Notice Board</h2>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
          </div>
        ) : !notices?.length ? (
          <Card className="border-dashed">
            <CardContent className="p-6 text-center text-muted-foreground">
              <Megaphone className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No notices yet. Check back soon.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {notices.map((n) => (
              <Card key={n.id} className="overflow-hidden shadow-card hover:shadow-elevated transition-shadow">
                {n.image_url && (
                  <img src={n.image_url} alt={n.title} className="w-full max-h-64 object-cover" />
                )}
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-display font-bold text-base md:text-lg">{n.title}</h3>
                    <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                      {new Date(n.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </span>
                  </div>
                  <p className="text-sm text-foreground/80 mt-1.5 whitespace-pre-wrap">{n.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* QUICK LINKS */}
      <section className="container px-4 pb-10">
        <div className="grid grid-cols-2 gap-3">
          <Link to="/courses" className="group">
            <Card className="shadow-card group-hover:shadow-elevated transition-all">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 grid place-items-center text-primary">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold">Courses</p>
                  <p className="text-xs text-muted-foreground">Browse all</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link to="/my-learning" className="group">
            <Card className="shadow-card group-hover:shadow-elevated transition-all">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-accent/15 grid place-items-center text-accent">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold">My Learning</p>
                  <p className="text-xs text-muted-foreground">Continue watching</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </section>
    </AppLayout>
  );
}
