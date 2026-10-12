import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Radio, CalendarClock, History, PlayCircle, Timer } from "lucide-react";

type Live = { id: string; title: string; thumbnail: string; status: "live" | "upcoming" | "past"; scheduledAt: string | null; startedAt: string | null; endedAt: string | null };
const EARLY_MS = 10 * 60 * 1000;

function useNow() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  return now;
}
const fmtLeft = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return d ? `${d}d ${pad(h)}h ${pad(m)}m` : `${pad(h)}:${pad(m)}:${pad(sec)}`;
};
const fmtDate = (iso: string | null) => iso ? new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "";
const thumbOf = (l: Live) => l.thumbnail || `https://i.ytimg.com/vi/${l.id}/hqdefault.jpg`;

export default function LivePage() {
  const now = useNow();
  const [watching, setWatching] = useState<Live | null>(null);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["live"],
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("youtube-live");
      if (error) throw error;
      return data as { live: Live[]; upcoming: Live[]; past: Live[] };
    },
  });

  return (
    <AppLayout>
      <section className="bg-hero text-primary-foreground">
        <div className="container px-4 py-7">
          <h1 className="font-display text-2xl md:text-3xl font-extrabold flex items-center gap-2"><Radio className="h-7 w-7" /> Live classes</h1>
          <p className="opacity-85 text-sm mt-1">Join Dev Sir live, see what's coming up, and catch up on past lives.</p>
        </div>
      </section>

      <section className="container px-4 py-6 space-y-8">
        {isLoading ? <Skeleton className="h-48 w-full" /> : isError ? (
          <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Couldn't load live classes. Please try again shortly.</CardContent></Card>
        ) : (
          <>
            <div>
              <h2 className="font-display font-bold text-lg mb-3 flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-destructive animate-pulse" /> Live now</h2>
              {data?.live.length ? (
                <div className="grid sm:grid-cols-2 gap-4">
                  {data.live.map((l) => (
                    <button key={l.id} className="text-left group" onClick={() => setWatching(l)}>
                      <Card className="overflow-hidden shadow-card hover-lift">
                        <div className="relative aspect-video bg-hero">
                          <img src={thumbOf(l)} alt={l.title} className="w-full h-full object-cover" />
                          <Badge className="absolute top-2 left-2 bg-destructive text-destructive-foreground border-0">● LIVE</Badge>
                          <div className="absolute inset-0 grid place-items-center"><PlayCircle className="h-14 w-14 text-primary-foreground drop-shadow-lg" /></div>
                        </div>
                        <CardContent className="p-3"><p className="font-semibold line-clamp-2">{l.title}</p></CardContent>
                      </Card>
                    </button>
                  ))}
                </div>
              ) : <p className="text-sm text-muted-foreground">No live class right now.</p>}
            </div>

            <div>
              <h2 className="font-display font-bold text-lg mb-3 flex items-center gap-2"><CalendarClock className="h-5 w-5" /> Upcoming</h2>
              {data?.upcoming.length ? (
                <div className="space-y-3">
                  {data.upcoming.map((l) => {
                    const start = l.scheduledAt ? new Date(l.scheduledAt).getTime() : null;
                    const canJoin = !start || start - now <= EARLY_MS;
                    return (
                      <Card key={l.id} className="shadow-card overflow-hidden">
                        <CardContent className="p-3 flex gap-3 items-center">
                          <img src={thumbOf(l)} alt="" className="h-16 w-28 rounded-md object-cover shrink-0 bg-secondary" />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm line-clamp-2">{l.title}</p>
                            {start && <p className="text-xs text-muted-foreground mt-0.5">{fmtDate(l.scheduledAt)}</p>}
                            {start && <p className="text-xs font-semibold text-primary mt-0.5 inline-flex items-center gap-1"><Timer className="h-3 w-3" />Starts in {fmtLeft(start - now)}</p>}
                          </div>
                          <Button size="sm" className="shrink-0 tap-scale" disabled={!canJoin} onClick={() => setWatching(l)}>
                            {canJoin ? "Join" : "Opens 10 min before"}
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : <p className="text-sm text-muted-foreground">No upcoming lives scheduled.</p>}
            </div>

            <div>
              <h2 className="font-display font-bold text-lg mb-3 flex items-center gap-2"><History className="h-5 w-5" /> Past lives</h2>
              {data?.past.length ? (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                  {data.past.map((l) => (
                    <button key={l.id} className="text-left" onClick={() => setWatching(l)}>
                      <Card className="overflow-hidden shadow-card hover-lift h-full">
                        <div className="aspect-video bg-secondary"><img src={thumbOf(l)} alt={l.title} loading="lazy" className="w-full h-full object-cover" /></div>
                        <CardContent className="p-2.5">
                          <p className="font-semibold text-xs line-clamp-2">{l.title}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{fmtDate(l.startedAt || l.scheduledAt)}</p>
                        </CardContent>
                      </Card>
                    </button>
                  ))}
                </div>
              ) : <p className="text-sm text-muted-foreground">No past lives yet.</p>}
            </div>
          </>
        )}
      </section>

      <Dialog open={!!watching} onOpenChange={(v) => !v && setWatching(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          <DialogHeader className="p-3 pb-0"><DialogTitle className="text-sm truncate pr-6">{watching?.title}</DialogTitle></DialogHeader>
          {watching && <Player live={watching} now={now} />}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

function Player({ live, now }: { live: Live; now: number }) {
  const start = live.status === "upcoming" && live.scheduledAt ? new Date(live.scheduledAt).getTime() : null;
  const waiting = start !== null && start > now;
  return (
    <div className="aspect-video bg-muted relative">
      <iframe className="w-full h-full" src={`https://www.youtube.com/embed/${live.id}?autoplay=1`} title={live.title}
        allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
      {waiting && (
        <div className="absolute inset-x-0 top-0 p-3 flex justify-center pointer-events-none">
          <div className="glass rounded-full px-4 py-1.5 text-sm font-semibold shadow-card inline-flex items-center gap-2 bg-background/90">
            <Timer className="h-4 w-4 text-primary" /> Live starts in {fmtLeft(start! - now)}
          </div>
        </div>
      )}
    </div>
  );
}
