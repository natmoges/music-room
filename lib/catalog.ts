import { ART, STORE } from "./site";

// One beat as the room knows it: what the BeatStars feed says, plus its file in data/beats.
export type Beat = {
  id: string;
  slug: string;
  title: string;
  art: string;
  free: boolean;
  licenses?: Record<string, number>; // license key -> price, from the feed
  bpm: number | null;
  key: string | null;
  mood: string[];
  tags: string[];
  youtube: string | null;
  preview: string | null; // resolved URL, or null when there's no audio yet
  visualizer: string | null;
};

// "[FREE] Lil Uzi Vert Type Beat Universal" → name "Universal", after "Lil Uzi Vert"
export function readTitle(title: string) {
  const clean = title.replace(/\[[^\]]*\]/g, "").replace(/\s+/g, " ").trim();
  const m = clean.match(/^(.*?)\s*type beat\s*(?:\d{4}\s*)?(.*)$/i);
  if (!m) return { name: clean, after: "" };
  const name = (m[2] || m[1]).replace(/^["'\\“”]+|["'\\“”]+$/g, "").replace(/\s*\d{4}$/, "").trim();
  return { name: name || clean, after: m[1].trim() };
}

export const artUrl = (b: Beat) => (b.art ? ART + b.art : "");
// The store link carries where the buyer came from, so the purchase on BeatStars can be traced
// back to the room (and to the license they were looking at).
export const storeUrl = (b: Beat, license?: string, tune?: string) => {
  const u = new URL(`${STORE}/beat/${b.slug}-${b.id}`);
  u.searchParams.set("utm_source", "natftp.com");
  u.searchParams.set("utm_medium", "music_room");
  u.searchParams.set("utm_campaign", b.id);
  if (license) u.searchParams.set("utm_content", license);
  if (tune) u.searchParams.set("utm_term", tune); // the tempo/key they tried, e.g. key_t-5_k1
  return u.toString();
};
export const listenUrl = (b: Beat) =>
  b.youtube ? `https://www.youtube.com/watch?v=${b.youtube}` : `https://www.youtube.com/@NatFTP/search?query=${encodeURIComponent(readTitle(b.title).name)}`;
