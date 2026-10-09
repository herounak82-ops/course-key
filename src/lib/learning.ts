import { supabase } from "@/integrations/supabase/client";

export const KINDS = [
  { value: "folder", label: "Folder" },
  { value: "upload", label: "Uploaded file" },
  { value: "drive_folder", label: "Drive folder (auto-lists files)" },
  { value: "drive_file", label: "Drive file / link" },
  { value: "yt_playlist", label: "YouTube playlist / series" },
  { value: "yt_video", label: "YouTube video (incl. unlisted)" },
  { value: "link", label: "Other link" },
] as const;

/** Kinds the admin can add via the "Add link" dialog. */
export const LINK_KINDS = KINDS.filter((k) => k.value !== "folder" && k.value !== "upload");

export type Kind = (typeof KINDS)[number]["value"];

/** Extract an ID from a pasted URL or return the raw value. */
export function normaliseRef(kind: string, input: string): string {
  const v = input.trim();
  if (kind === "drive_folder") return v.match(/folders\/([\w-]+)/)?.[1] ?? v.match(/[?&]id=([\w-]+)/)?.[1] ?? v;
  if (kind === "drive_file") {
    const id = v.match(/\/d\/([\w-]+)/)?.[1] ?? v.match(/[?&]id=([\w-]+)/)?.[1];
    return id ?? v;
  }
  if (kind === "yt_playlist") return v.match(/[?&]list=([\w-]+)/)?.[1] ?? v;
  if (kind === "yt_video")
    return v.match(/(?:v=|youtu\.be\/|embed\/|shorts\/|live\/)([\w-]{11})/)?.[1] ?? v;
  return v;
}

export const driveFileUrl = (ref: string) =>
  /^https?:/.test(ref) ? ref : `https://drive.google.com/file/d/${ref}/view`;
export const drivePreviewUrl = (id: string) => `https://drive.google.com/file/d/${id}/preview`;

export const STUDY_BUCKET = "study-files";

/** Signed URL + best in-app preview URL for an uploaded file. */
export async function uploadedFileUrls(path: string, mime?: string | null) {
  const { data, error } = await supabase.storage.from(STUDY_BUCKET).createSignedUrl(path, 60 * 60 * 3);
  if (error || !data) throw error ?? new Error("Could not open file");
  const url = data.signedUrl;
  const m = mime ?? "";
  const native = m.startsWith("image/") || m.startsWith("video/") || m.startsWith("audio/") || m === "application/pdf" || m.startsWith("text/");
  const preview = native ? url : `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(url)}`;
  return { url, preview };
}

export const formatSize = (b?: number | null) => {
  if (!b) return "";
  if (b < 1024 * 1024) return `${Math.max(1, Math.round(b / 1024))} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
};
