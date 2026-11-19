import catalog from "@/data/catalog.json";
import published from "@/data/published.json";
import { ART, STORE } from "./site";

export type Beat = { id: string; slug: string; title: string; art: string; free: boolean };

// Everything BeatStars knows about, and the part of it that's public: only the beats
// published on YouTube are up in the room.
export const ALL_BEATS = catalog as Beat[];
const LIVE = new Set(published.ids);
export const BEATS = ALL_BEATS.filter((b) => LIVE.has(b.id));

// "[FREE] Lil Uzi Vert Type Beat Universal" → name "Universal", tags "Lil Uzi Vert"
export function readTitle(title: string) {
  const clean = title.replace(/\[[^\]]*\]/g, "").replace(/\s+/g, " ").trim();
  const m = clean.match(/^(.*?)\s*type beat\s*(?:\d{4}\s*)?(.*)$/i);
  if (!m) return { name: clean, after: "" };
  const name = (m[2] || m[1]).replace(/^["'\\]+|["'\\]+$/g, "").trim();
  return { name: name || clean, after: m[1].trim() };
}

export const artUrl = (b: Beat) => (b.art ? ART + b.art : "");
export const storeUrl = (b: Beat) => `${STORE}/beat/${b.slug}-${b.id}`;

export function findBeat(param: string) {
  const id = param.match(/(\d+)$/)?.[1];
  return BEATS.find((b) => b.id === id);
}
