import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Youtube, PlayCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Video {
  id: string;
  title: string;
  publishedAt: string;
  thumbnail: string;
}

export function YouTubeLatest({ handle = "devstudypoint1993", limit = 6 }: { handle?: string; limit?: number }) {
  const [openId, setOpenId] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["yt-latest", handle, limit],
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("get-latest-videos", {
        body: undefined,
        // Use query params via path; since invoke doesn't support GET with query nicely,
        // we'll send as a GET with method override
      });
      if (error) throw error;
      return data as { videos: Video[] };
    },
  });

  // Fallback: directly call the function URL with query params (since invoke is POST by default)
  const { data: fallback } = useQuery({
    queryKey: ["yt-latest-fallback", handle, limit],
    enabled: !data && !isLoading,
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/get-latest-videos?handle=${handle}&limit=${limit}`,
        {
          headers: {
            "Authorization": `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        },
      );
      if (!res.ok) throw new Error("Failed to load");
      return await res.json() as { videos: Video[] };
    },
  });

  const videos = data?.videos ?? fallback?.videos ?? [];

  return (
    <section className="container px-4 py-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Youtube className="h-6 w-6 text-[hsl(0,75%,55%)]" />
          <h2 className="font-display text-xl md:text-2xl font-bold">Latest from YouTube</h2>
        </div>
        <Button asChild variant="outline" size="sm" className="hover-lift">
          <a href={`https://www.youtube.com/@${handle}`} target="_blank" rel="noreferrer">
            Visit Channel <ExternalLink className="h-3 w-3 ml-1" />
          </a>
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="aspect-video w-full" />
          ))}
        </div>
      ) : isError || !videos.length ? (
        <Card className="border-dashed">
          <CardContent className="p-6 text-center text-muted-foreground text-sm">
            Couldn't load videos right now. Visit the channel directly.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          {videos.map((v) => (
            <button
              key={v.id}
              onClick={() => setOpenId(v.id)}
              className="text-left group hover-lift"
            >
              <Card className="overflow-hidden shadow-card group-hover:shadow-elevated transition-all">
                <div className="relative aspect-video bg-muted overflow-hidden">
                  <img
                    src={v.thumbnail}
                    alt={v.title}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity grid place-items-center">
                    <PlayCircle className="h-12 w-12 text-white drop-shadow-lg" />
                  </div>
                </div>
                <CardContent className="p-2.5">
                  <p className="text-xs md:text-sm font-medium line-clamp-2 leading-snug">{v.title}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {new Date(v.publishedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      )}

      <Dialog open={!!openId} onOpenChange={(v) => !v && setOpenId(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Video player</DialogTitle>
          </DialogHeader>
          {openId && (
            <div className="aspect-video bg-black">
              <iframe
                className="w-full h-full"
                src={`https://www.youtube.com/embed/${openId}?autoplay=1`}
                title="YouTube video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
