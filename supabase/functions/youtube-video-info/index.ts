// Returns title, thumbnail and scheduled start time for a YouTube video/live ID.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { videoId } = await req.json();
    if (!/^[\w-]{11}$/.test(videoId ?? "")) return json({ error: "Invalid video ID" }, 400);
    const key = Deno.env.get("YOUTUBE_API_KEY");
    const r = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,liveStreamingDetails&id=${videoId}&key=${key}`);
    const j = await r.json();
    const v = j.items?.[0];
    if (!v) return json({ error: "Video not found (it may be private)" }, 404);
    const t = v.snippet?.thumbnails ?? {};
    return json({
      title: v.snippet?.title ?? "",
      thumbnail: t.maxres?.url || t.high?.url || t.medium?.url || "",
      scheduledAt: v.liveStreamingDetails?.scheduledStartTime || v.liveStreamingDetails?.actualStartTime || null,
    });
  } catch (e) { return json({ error: String(e) }, 500); }
});
