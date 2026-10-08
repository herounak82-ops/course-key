// Lists files inside a Google Drive folder using the service account.
// POST { folderId }
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

let cached: { token: string; exp: number } | null = null;

function creds() {
  const raw = Deno.env.get("DRIVE_PRIVATE_KEY") ?? "";
  try {
    const j = JSON.parse(raw);
    return { email: j.client_email as string, key: j.private_key as string };
  } catch {
    return { email: Deno.env.get("DRIVE_CLIENT_EMAIL") ?? "", key: raw.replace(/\\n/g, "\n") };
  }
}

const b64url = (data: Uint8Array | string) => {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
  let s = "";
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

async function getToken() {
  if (cached && cached.exp > Date.now() + 60_000) return cached.token;
  const { email, key } = creds();
  if (!email || !key) throw new Error("Drive credentials missing");
  const pem = key.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const ck = await crypto.subtle.importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${b64url(JSON.stringify({
    iss: email, scope: "https://www.googleapis.com/auth/drive.readonly",
    aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600,
  }))}`;
  const sig = new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", ck, new TextEncoder().encode(unsigned)));
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${b64url(sig)}` }),
  });
  const t = await res.json();
  if (!res.ok) throw new Error(`Token error: ${JSON.stringify(t)}`);
  cached = { token: t.access_token, exp: Date.now() + t.expires_in * 1000 };
  return cached.token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { folderId } = await req.json();
    if (typeof folderId !== "string" || !/^[\w-]{10,100}$/.test(folderId)) return json({ error: "Invalid folder" }, 400);
    const token = await getToken();
    const q = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
    const fields = encodeURIComponent("files(id,name,mimeType,size,modifiedTime,webViewLink,iconLink,thumbnailLink)");
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${q}&fields=${fields}&orderBy=folder,name&pageSize=200&supportsAllDrives=true&includeItemsFromAllDrives=true`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const body = await res.json();
    if (!res.ok) return json({ error: "Drive error", status: res.status, details: body }, res.status);
    return json({ files: body.files ?? [] });
  } catch (e) {
    console.error(e);
    return json({ error: String(e) }, 500);
  }
});
