// Fetch latest videos from a YouTube channel by handle.
// GET /get-latest-videos?handle=devstudypoint1993&limit=6

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface VideoItem {
  id: string;
  title: string;
  publishedAt: string;
  thumbnail: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("YOUTUBE_API_KEY");
    if (!apiKey) {
      return json({ error: "YOUTUBE_API_KEY not configured" }, 500);
    }

    const url = new URL(req.url);
    const handle = (url.searchParams.get("handle") || "devstudypoint1993").replace(
      /^@/,
      "",
    );
    const limit = Math.min(
      Math.max(parseInt(url.searchParams.get("limit") || "6", 10), 1),
      12,
    );

    // 1) Resolve handle -> channelId via channels endpoint
    const chRes = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=contentDetails,snippet&forHandle=${encodeURIComponent(
        handle,
      )}&key=${apiKey}`,
    );
    const chData = await chRes.json();
    if (!chRes.ok) {
      console.error("YouTube channels error", chData);
      return json({ error: "Failed to resolve channel", details: chData }, 502);
    }
    const channel = chData.items?.[0];
    if (!channel) return json({ error: "Channel not found" }, 404);
    const uploadsId = channel.contentDetails?.relatedPlaylists?.uploads;
    if (!uploadsId) return json({ error: "Uploads playlist not found" }, 404);

    // 2) Fetch latest items from uploads playlist
    const plRes = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=${limit}&playlistId=${uploadsId}&key=${apiKey}`,
    );
    const plData = await plRes.json();
    if (!plRes.ok) {
      console.error("YouTube playlistItems error", plData);
      return json({ error: "Failed to fetch videos", details: plData }, 502);
    }

    const videos: VideoItem[] = (plData.items || []).map((it: any) => {
      const thumbs = it.snippet?.thumbnails || {};
      const thumb =
        thumbs.maxres?.url ||
        thumbs.standard?.url ||
        thumbs.high?.url ||
        thumbs.medium?.url ||
        thumbs.default?.url ||
        "";
      return {
        id: it.snippet?.resourceId?.videoId,
        title: it.snippet?.title,
        publishedAt: it.snippet?.publishedAt,
        thumbnail: thumb,
      };
    });

    return json({
      channel: {
        id: channel.id,
        title: channel.snippet?.title,
        thumbnail: channel.snippet?.thumbnails?.default?.url,
      },
      videos,
    });
  } catch (err) {
    console.error("get-latest-videos error", err);
    return json({ error: (err as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
