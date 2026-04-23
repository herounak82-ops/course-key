import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { GraduationCap, PlayCircle, Clock, IndianRupee } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function MyLearning() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["my-learning", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_access")
        .select("status, created_at, course:courses(*)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const active = data?.filter((d) => d.status === "active") ?? [];
  const pending = data?.filter((d) => d.status === "pending") ?? [];

  return (
    <AppLayout>
      <section className="bg-hero text-primary-foreground">
        <div className="container px-4 py-7">
          <h1 className="font-display text-2xl md:text-3xl font-extrabold flex items-center gap-2">
            <GraduationCap className="h-7 w-7" /> My Learning
          </h1>
          <p className="opacity-85 text-sm mt-1">Your enrolled and pending courses.</p>
        </div>
      </section>

      <section className="container px-4 py-6 space-y-8">
        <div>
          <h2 className="font-display font-bold text-lg mb-3">Enrolled</h2>
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : active.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center text-muted-foreground">
                <PlayCircle className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="mb-3">You haven't unlocked any courses yet.</p>
                <Button asChild><Link to="/courses">Browse courses</Link></Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {active.map((a: any) => (
                <Link key={a.course.id} to={`/courses/${a.course.id}`} className="group">
                  <Card className="overflow-hidden shadow-card group-hover:shadow-elevated transition-all">
                    <div className="aspect-video bg-secondary relative">
                      {a.course.thumbnail_url ? (
                        <img src={a.course.thumbnail_url} alt={a.course.title} className="w-full h-full object-cover" />
                      ) : <div className="w-full h-full bg-hero" />}
                      <div className="absolute inset-0 grid place-items-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                        <PlayCircle className="h-12 w-12 text-white" />
                      </div>
                    </div>
                    <CardContent className="p-3">
                      <h3 className="font-display font-bold line-clamp-2">{a.course.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1">Tap to watch</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>

        {pending.length > 0 && (
          <div>
            <h2 className="font-display font-bold text-lg mb-3">Awaiting verification</h2>
            <div className="space-y-3">
              {pending.map((a: any) => (
                <Card key={a.course.id} className="shadow-card">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="h-12 w-12 rounded-lg bg-warning/15 grid place-items-center text-warning shrink-0">
                      <Clock className="h-6 w-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{a.course.title}</p>
                      <p className="text-xs text-muted-foreground inline-flex items-center">
                        <IndianRupee className="h-3 w-3" />{Number(a.course.price).toLocaleString("en-IN")} · submitted {new Date(a.created_at).toLocaleDateString("en-IN")}
                      </p>
                    </div>
                    <Badge className="bg-warning text-warning-foreground border-0">Pending</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </section>
    </AppLayout>
  );
}
