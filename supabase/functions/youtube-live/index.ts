// Live / upcoming / past live streams for the channel + admin-added streams.
// Uses cheap API calls (uploads playlist + videos.list) and caches 2 minutes.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const HANDLE = "devstudypoint1993";
const TTL_MS = 2 * 60 * 1000;
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

type Live = {
  id: string; title: string; thumbnail: string; status: "live" | "upcoming" | "past";
  scheduledAt: string | null; startedAt: string | null; endedAt: string | null; manual?: boolean;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: manual } = await db.from("live_sessions").select("*").eq("is_published", true);
    const sig = JSON.stringify((manual ?? []).map((m) => [m.id, m.video_id, m.title, m.thumbnail_url, m.scheduled_at]));

    const { data: cache } = await db.from("yt_cache").select("*").eq("key", "live").maybeSingle();
    if (cache && Date.now() - new Date(cache.fetched_at).getTime() < TTL_MS && cache.payload?.sig === sig) {
      return json(cache.payload.data);
    }

    const key = Deno.env.get("YOUTUBE_API_KEY");
    if (!key) return json({ error: "YOUTUBE_API_KEY missing" }, 500);
    const yt = async (path: string) => {
      const r = await fetch(`https://www.googleapis.com/youtube/v3/${path}&key=${key}`);
      const j = await r.json();
      if (!r.ok) throw new Error(JSON.stringify(j));
      return j;
    };

    const ch = await yt(`channels?part=contentDetails&forHandle=${HANDLE}`);
    const uploads = ch.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    const pl = uploads ? await yt(`playlistItems?part=contentDetails&maxResults=50&playlistId=${uploads}`) : { items: [] };
    const ids = new Set<string>((pl.items ?? []).map((i: any) => i.contentDetails?.videoId).filter(Boolean));
    for (const m of manual ?? []) ids.add(m.video_id);

    const list = [...ids].slice(0, 50);
    const vids = list.length ? await yt(`videos?part=snippet,liveStreamingDetails&id=${list.join(",")}`) : { items: [] };
    const byManual = new Map((manual ?? []).map((m) => [m.video_id, m]));

    const out: Live[] = [];
    for (const v of vids.items ?? []) {
      const d = v.liveStreamingDetails;
      const m = byManual.get(v.id);
      if (!d && !m) continue; // normal upload, not a stream
      const b = v.snippet?.liveBroadcastContent;
      const status: Live["status"] = b === "live" ? "live" : b === "upcoming" ? "upcoming" : "past";
      const t = v.snippet?.thumbnails ?? {};
      out.push({
        id: v.id,
        title: m?.title || v.snippet?.title,
        thumbnail: m?.thumbnail_url || t.maxres?.url || t.high?.url || t.medium?.url || "",
        status,
        scheduledAt: m?.scheduled_at || d?.scheduledStartTime || null,
        startedAt: d?.actualStartTime || null,
        endedAt: d?.actualEndTime || null,
        manual: !!m,
      });
    }
    // Manual entries YouTube couldn't return (e.g. not yet created) — trust admin time
    for (const m of manual ?? []) {
      if (out.some((o) => o.id === m.video_id)) continue;
      const future = m.scheduled_at && new Date(m.scheduled_at).getTime() > Date.now();
      out.push({ id: m.video_id, title: m.title, thumbnail: m.thumbnail_url || "", status: future ? "upcoming" : "live",
        scheduledAt: m.scheduled_at, startedAt: null, endedAt: null, manual: true });
    }

    const time = (l: Live) => new Date(l.startedAt || l.scheduledAt || 0).getTime();
    const data = {
      live: out.filter((o) => o.status === "live"),
      upcoming: out.filter((o) => o.status === "upcoming").sort((a, b) => time(a) - time(b)),
      past: out.filter((o) => o.status === "past").sort((a, b) => time(b) - time(a)).slice(0, 24),
    };
    await db.from("yt_cache").upsert({ key: "live", payload: { sig, data }, fetched_at: new Date().toISOString() });
    return json(data);
  } catch (e) {
    console.error("youtube-live", e);
    return json({ error: String(e) }, 500);
  }
});
