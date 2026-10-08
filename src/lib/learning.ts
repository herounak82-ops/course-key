export const KINDS = [
  { value: "drive_folder", label: "Drive folder (auto-lists files)" },
  { value: "drive_file", label: "Drive file / link" },
  { value: "yt_playlist", label: "YouTube playlist / series" },
  { value: "yt_video", label: "YouTube video (incl. unlisted)" },
  { value: "link", label: "Other link" },
] as const;

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
