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

import logo from "@/assets/logo.png";
import {
  ArrowRight,
  BookOpen,
  GraduationCap,
  Megaphone,
  Sparkles,
  Youtube,
  Facebook,
  MapPin,
  Phone,
  Mail,
  Award,
  Users,
  Heart,
} from "lucide-react";
import { YouTubeLatest } from "@/components/YouTubeLatest";

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

  const { data: settings } = useQuery({
    queryKey: ["app-settings-home"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("*")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const youtubeUrl = settings?.youtube_url || "https://www.youtube.com/@devstudypoint1993";
  const facebookUrl = settings?.facebook_url || "https://www.facebook.com/share/18YP2FWvvG/";
  const address = settings?.address ||
    "Dev Study Point Coaching Centre,\nNear Main Market, India";
  const mapEmbed =
    settings?.map_embed_url ||
    "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d56026.59!2d77.20653!3d28.6139!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x390cfd5b347eb62d%3A0x52c2b7494e204dce!2sIndia!5e0!3m2!1sen!2sin!4v1700000000";
  const contactPhone = settings?.contact_phone;
  const contactEmail = settings?.contact_email;

  return (
    <AppLayout>
      {/* HERO */}
      <section className="relative bg-hero text-primary-foreground overflow-hidden">
        <div className="absolute inset-0 opacity-25">
          <img src={teacherStudents} alt="" aria-hidden className="w-full h-full object-cover" />
        </div>
        <div className="relative container px-4 py-10 md:py-20 grid md:grid-cols-2 gap-8 items-center">
          <div className="animate-fade-in">
            <Badge className="bg-accent/90 text-accent-foreground border-0 mb-3 hover-glow">
              <Sparkles className="h-3 w-3 mr-1" /> India's trusted local coaching
            </Badge>
            <h1 className="font-display text-3xl md:text-5xl font-extrabold leading-tight">
              Learn smarter with <span className="text-accent">Dev Sharma</span>
            </h1>
            <p className="mt-3 md:text-lg opacity-90 max-w-xl">
              Mathematics, mathematical reasoning & competitive exam prep (Banking, Railway and more) — taught with the clarity that comes from a decade in the classroom.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-cta hover:opacity-95 shadow-cta border-0 tap-scale">
                <Link to="/courses">Browse Courses <ArrowRight className="h-4 w-4 ml-1" /></Link>
              </Button>
              <Button asChild size="lg" variant="secondary" className="bg-white/10 hover:bg-white/20 text-primary-foreground border-white/20 tap-scale">
                <Link to="/my-learning">My Learning</Link>
              </Button>
            </div>
            <div className="mt-6 flex items-center gap-3">
              <img src={teacherPortrait} alt="Dayaram (Dev) Sharma" className="h-12 w-12 rounded-full object-cover ring-2 ring-white/30" />
              <div className="text-sm">
                <p className="font-semibold">Dayaram "Dev" Sharma</p>
                <p className="opacity-80 text-xs">Founder · Dev Study Point</p>
              </div>
            </div>
          </div>
          <div className="hidden md:block animate-scale-in">
            <img src={teacherBoard} alt="Dev Sharma teaching" className="rounded-2xl shadow-elevated object-cover w-full aspect-square hover-lift" />
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="container px-4 -mt-6 relative z-10">
        <div className="grid grid-cols-3 gap-3 md:gap-4">
          {[
            { label: "Years teaching", value: "10+", icon: Award },
            { label: "Students taught", value: "1000+", icon: Users },
            { label: "Success stories", value: "100+", icon: BookOpen },
          ].map((s) => (
            <Card key={s.label} className="shadow-card border-0 bg-card hover-lift">
              <CardContent className="p-3 md:p-4 text-center">
                <s.icon className="h-5 w-5 mx-auto mb-1 text-accent" />
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
              <Card key={n.id} className="overflow-hidden shadow-card hover-lift">
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
      <section className="container px-4">
        <div className="grid grid-cols-2 gap-3">
          <Link to="/courses" className="group">
            <Card className="shadow-card group-hover:shadow-elevated transition-all hover-lift">
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
            <Card className="shadow-card group-hover:shadow-elevated transition-all hover-lift">
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

      {/* YOUTUBE LATEST */}
      <YouTubeLatest handle="devstudypoint1993" limit={6} />

      {/* ABOUT OUR CENTRE */}
      <section className="container px-4 py-8">
        <div className="flex items-center gap-2 mb-4">
          <Heart className="h-5 w-5 text-accent" />
          <h2 className="font-display text-xl md:text-2xl font-bold">About Our Centre</h2>
        </div>
        <Card className="shadow-card overflow-hidden">
          <div className="grid md:grid-cols-2 gap-0">
            <div className="grid grid-cols-1 gap-1.5 p-1.5">
              <img src={teacherStudents} alt="Students learning" className="rounded-lg w-full h-40 md:h-44 object-cover hover-lift" />
              <img src={teacherBoard} alt="Whiteboard classes" className="rounded-lg w-full h-40 md:h-44 object-cover hover-lift" />
            </div>
            <CardContent className="p-5 md:p-6 flex flex-col justify-center">
              <h3 className="font-display text-xl font-bold text-primary mb-2">
                A decade of dedicated teaching
              </h3>
              <p className="text-sm md:text-base text-foreground/80 leading-relaxed">
              <strong>Dev Study Point</strong>, founded by <strong>Dayaram "Dev" Sharma</strong>,
                has helped over 1,000 students master Mathematics, mathematical reasoning,
                and competitive exam preparation including Banking and Railway. Our centre
                combines old-school discipline with modern, concept-first teaching — every
                doubt addressed, every student supported.
              </p>
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="flex items-center gap-2 text-sm">
                  <Award className="h-4 w-4 text-accent shrink-0" />
                  <span>Experienced faculty</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <BookOpen className="h-4 w-4 text-accent shrink-0" />
                  <span>Concept-first method</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-accent shrink-0" />
                  <span>Small batches</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Sparkles className="h-4 w-4 text-accent shrink-0" />
                  <span>Regular tests</span>
                </div>
              </div>
            </CardContent>
          </div>
        </Card>
      </section>

      {/* FIND US — MAP */}
      <section className="container px-4 py-8">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="h-5 w-5 text-accent" />
          <h2 className="font-display text-xl md:text-2xl font-bold">Find Us</h2>
        </div>
        <Card className="shadow-card overflow-hidden">
          <div className="grid md:grid-cols-2 gap-0">
            <div className="aspect-video md:aspect-auto md:h-full bg-muted">
              <iframe
                src={mapEmbed}
                title="Dev Study Point location"
                className="w-full h-full min-h-[240px] border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>
            <CardContent className="p-5 space-y-3">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Address</p>
                <p className="text-sm whitespace-pre-line mt-1">{address}</p>
              </div>
              {contactPhone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-accent" />
                  <a href={`tel:${contactPhone}`} className="font-medium hover:underline">{contactPhone}</a>
                </div>
              )}
              {contactEmail && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-accent" />
                  <a href={`mailto:${contactEmail}`} className="font-medium hover:underline break-all">{contactEmail}</a>
                </div>
              )}
              <Button asChild variant="outline" size="sm" className="hover-lift">
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open in Google Maps
                </a>
              </Button>
            </CardContent>
          </div>
        </Card>
      </section>

      {/* FOOTER WITH SOCIAL */}
      <footer className="bg-hero text-primary-foreground mt-6">
        <div className="container px-4 py-8 md:py-10">
          <div className="grid md:grid-cols-3 gap-6 items-start">
            <div className="flex items-start gap-3">
              <img src={logo} alt="" className="h-12 w-12 bg-white rounded-xl p-1.5" />
              <div>
                <p className="font-display font-extrabold text-lg leading-none">Dev Study Point</p>
                <p className="text-[11px] uppercase tracking-wider opacity-80 mt-1">by Dev Sharma</p>
                <p className="text-xs opacity-80 mt-2 max-w-xs">
                  Learn at your own pace with Dev Sir — become our next success story.
                </p>
              </div>
            </div>

            <div>
              <p className="font-semibold mb-2">Quick Links</p>
              <ul className="space-y-1.5 text-sm opacity-90">
                <li><Link to="/courses" className="hover:underline">All Courses</Link></li>
                <li><Link to="/my-learning" className="hover:underline">My Learning</Link></li>
                <li><Link to="/profile" className="hover:underline">Profile</Link></li>
              </ul>
            </div>

            <div>
              <p className="font-semibold mb-2">Connect</p>
              <div className="flex gap-2">
                <a
                  href={youtubeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="h-10 w-10 grid place-items-center rounded-full bg-white/10 hover:bg-white/20 transition-colors hover-lift"
                  aria-label="YouTube"
                >
                  <Youtube className="h-5 w-5" />
                </a>
                <a
                  href={facebookUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="h-10 w-10 grid place-items-center rounded-full bg-white/10 hover:bg-white/20 transition-colors hover-lift"
                  aria-label="Facebook"
                >
                  <Facebook className="h-5 w-5" />
                </a>
              </div>
              {contactPhone && (
                <a href={`tel:${contactPhone}`} className="text-xs opacity-80 mt-3 inline-block hover:underline">
                  📞 {contactPhone}
                </a>
              )}
            </div>
          </div>

          <div className="border-t border-white/15 mt-6 pt-4 text-center text-[11px] opacity-75">
            © {new Date().getFullYear()} Dev Study Point · Coaching by Dayaram (Dev) Sharma · All rights reserved.
          </div>
        </div>
      </footer>
    </AppLayout>
  );
}
