import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { LogOut, Mail, Shield, User as UserIcon } from "lucide-react";

export default function Profile() {
  const { user, role, signOut } = useAuth();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const initial = profile?.full_name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? "?";

  return (
    <AppLayout>
      <section className="bg-hero text-primary-foreground">
        <div className="container px-4 py-7">
          <h1 className="font-display text-2xl md:text-3xl font-extrabold">Profile</h1>
        </div>
      </section>

      <section className="container px-4 py-6 space-y-4 max-w-xl">
        <Card className="shadow-card">
          <CardContent className="p-5 flex items-center gap-4">
            <Avatar className="h-16 w-16 bg-primary text-primary-foreground">
              <AvatarFallback className="bg-primary text-primary-foreground font-display font-bold text-xl">
                {initial}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              {isLoading ? <Skeleton className="h-5 w-32" /> : (
                <p className="font-display font-bold text-lg truncate">{profile?.full_name ?? "Student"}</p>
              )}
              <p className="text-sm text-muted-foreground inline-flex items-center gap-1.5 truncate">
                <Mail className="h-3.5 w-3.5" />{user?.email}
              </p>
              {role === "admin" && (
                <span className="inline-flex items-center gap-1 mt-1.5 text-[11px] font-semibold uppercase tracking-wider text-accent">
                  <Shield className="h-3 w-3" /> Admin
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {role === "admin" && (
          <Button asChild className="w-full" size="lg">
            <Link to="/admin"><Shield className="h-4 w-4 mr-2" /> Open Admin Dashboard</Link>
          </Button>
        )}

        <Card className="shadow-card">
          <CardContent className="p-0 divide-y">
            <Link to="/my-learning" className="flex items-center justify-between p-4 hover:bg-secondary transition-colors">
              <span className="inline-flex items-center gap-3"><UserIcon className="h-4 w-4 text-muted-foreground" /> My Learning</span>
              <span className="text-muted-foreground">›</span>
            </Link>
            <Link to="/courses" className="flex items-center justify-between p-4 hover:bg-secondary transition-colors">
              <span className="inline-flex items-center gap-3"><UserIcon className="h-4 w-4 text-muted-foreground" /> Browse Courses</span>
              <span className="text-muted-foreground">›</span>
            </Link>
          </CardContent>
        </Card>

        <Button variant="outline" size="lg" className="w-full" onClick={signOut}>
          <LogOut className="h-4 w-4 mr-2" /> Sign Out
        </Button>

        <p className="text-center text-xs text-muted-foreground pt-2">
          Dev Study Point · Coaching by Dayaram (Dev) Sharma
        </p>
      </section>
    </AppLayout>
  );
}
