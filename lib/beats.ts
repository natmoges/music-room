// Server-only: builds the room's beat list at build time from two sources.
//   data/catalog.json  — every beat BeatStars has (npm run sync)
//   data/beats/<id>.json — the beats that are up, and what the feed doesn't know
// Nothing here runs in the browser, so the files can grow without slowing the page.
import fs from "node:fs";
import path from "node:path";
import catalog from "@/data/catalog.json";
import type { Beat } from "./catalog";

type FeedRow = { id: string; slug: string; title: string; art: string; free: boolean };
type BeatFile = Partial<Omit<Beat, "id" | "preview">> & { id: string; published?: boolean; preview?: string | null | false; freeDownload?: boolean };

const ROOT = process.cwd();
const BEAT_DIR = path.join(ROOT, "data", "beats");
const PREVIEW_DIR = path.join(ROOT, "public", "previews");

function readBeatFiles(): Map<string, BeatFile> {
  const files = new Map<string, BeatFile>();
  if (!fs.existsSync(BEAT_DIR)) return files;
  for (const name of fs.readdirSync(BEAT_DIR)) {
    if (!name.endsWith(".json")) continue;
    try {
      const data = JSON.parse(fs.readFileSync(path.join(BEAT_DIR, name), "utf8")) as BeatFile;
      files.set(String(data.id ?? name.replace(/\.json$/, "")), data);
    } catch (err) {
      // A broken file should never take the site down; it's skipped and named in the build log.
      console.warn(`data/beats/${name}: skipped (${(err as Error).message})`);
    }
  }
  return files;
}

// preview: false means "this file is not this beat": nothing plays, even if a file is sitting there.
function resolvePreview(id: string, given?: string | null | false): string | null {
  if (given === false) return null;
  if (given) return given;
  return fs.existsSync(path.join(PREVIEW_DIR, `${id}.mp3`)) ? `/previews/${id}.mp3` : null;
}

function build(row: FeedRow, file?: BeatFile): Beat {
  return {
    ...row,
    bpm: typeof file?.bpm === "number" ? file.bpm : null,
    key: typeof file?.key === "string" ? file.key : null,
    mood: Array.isArray(file?.mood) ? file.mood.map(String) : [],
    tags: Array.isArray(file?.tags) ? file.tags.map(String) : [],
    youtube: file?.youtube ?? null,
    preview: resolvePreview(row.id, file?.preview),
    visualizer: file?.visualizer ?? null,
    freeDownload: file?.freeDownload === true,
  };
}

const FILES = readBeatFiles();
const FEED = catalog as FeedRow[];

/** Every beat BeatStars has (for addresses that must keep resolving). */
export const ALL_BEATS: Beat[] = FEED.map((row) => build(row, FILES.get(row.id)));

/** The beats that are up: a file in data/beats with published !== false. Newest first. */
export const BEATS: Beat[] = ALL_BEATS.filter((b) => {
  const f = FILES.get(b.id);
  return f && f.published !== false;
});

export function findBeat(param: string) {
  const id = param.match(/(\d+)$/)?.[1];
  return BEATS.find((b) => b.id === id);
}
