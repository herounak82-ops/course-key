export type RecentItem = { id: string; title: string; thumbnail_url: string | null; viewedAt: number };
const KEY = "dsp_recently_viewed";

export const getRecent = (): RecentItem[] => {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
};

export const addRecent = (item: Omit<RecentItem, "viewedAt">) => {
  const list = getRecent().filter((r) => r.id !== item.id);
  list.unshift({ ...item, viewedAt: Date.now() });
  localStorage.setItem(KEY, JSON.stringify(list.slice(0, 12)));
};
