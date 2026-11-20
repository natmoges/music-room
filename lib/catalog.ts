import { ART, STORE } from "./site";

// One beat as the room knows it: what the BeatStars feed says, plus its file in data/beats.
export type Beat = {
  id: string;
  slug: string;
  title: string;
  art: string;
  free: boolean;
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
export const storeUrl = (b: Beat) => `${STORE}/beat/${b.slug}-${b.id}`;
export const listenUrl = (b: Beat) =>
  b.youtube ? `https://www.youtube.com/watch?v=${b.youtube}` : `https://www.youtube.com/@NatFTP/search?query=${encodeURIComponent(readTitle(b.title).name)}`;
