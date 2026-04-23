import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { BookOpen, IndianRupee, CheckCircle2, Clock } from "lucide-react";

export default function Courses() {
  const { user } = useAuth();
  const { data: courses, isLoading } = useQuery({
    queryKey: ["courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("is_published", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: access } = useQuery({
    queryKey: ["my-access", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_access")
        .select("course_id, status")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data;
    },
  });

  const accessMap = new Map(access?.map((a) => [a.course_id, a.status]));

  return (
    <AppLayout>
      <section className="bg-hero text-primary-foreground">
        <div className="container px-4 py-7">
          <h1 className="font-display text-2xl md:text-3xl font-extrabold">All Courses</h1>
          <p className="opacity-85 text-sm mt-1">Pay once via UPI, learn at your pace.</p>
        </div>
      </section>

      <section className="container px-4 py-6">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-64 w-full" />)}
          </div>
        ) : !courses?.length ? (
          <Card className="border-dashed">
            <CardContent className="p-10 text-center text-muted-foreground">
              <BookOpen className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>No courses published yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map((c) => {
              const status = accessMap.get(c.id);
              return (
                <Link key={c.id} to={`/courses/${c.id}`} className="group">
                  <Card className="overflow-hidden shadow-card group-hover:shadow-elevated transition-all h-full">
                    <div className="aspect-video bg-secondary relative overflow-hidden">
                      {c.thumbnail_url ? (
                        <img src={c.thumbnail_url} alt={c.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      ) : (
                        <div className="w-full h-full bg-hero grid place-items-center">
                          <BookOpen className="h-10 w-10 text-primary-foreground/60" />
                        </div>
                      )}
                      {status === "active" && (
                        <Badge className="absolute top-2 right-2 bg-success text-success-foreground border-0">
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Enrolled
                        </Badge>
                      )}
                      {status === "pending" && (
                        <Badge className="absolute top-2 right-2 bg-warning text-warning-foreground border-0">
                          <Clock className="h-3 w-3 mr-1" /> Pending
                        </Badge>
                      )}
                    </div>
                    <CardContent className="p-3.5">
                      {c.category && <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{c.category}</p>}
                      <h3 className="font-display font-bold text-base mt-0.5 line-clamp-2">{c.title}</h3>
                      <div className="flex items-center justify-between mt-2.5">
                        <span className="inline-flex items-center font-bold text-primary">
                          <IndianRupee className="h-4 w-4" />{Number(c.price).toLocaleString("en-IN")}
                        </span>
                        <span className="text-xs text-accent font-semibold group-hover:underline">View →</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </AppLayout>
  );
}
