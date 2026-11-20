// natftp.com/catalog.json — the room's beats as data, for anything that wants to plug in:
// a visualizer script, a scheduler, an AI agent, a second site. Written at build time.
import { BEATS } from "@/lib/beats";
import { artUrl, readTitle, storeUrl } from "@/lib/catalog";
import { SITE } from "@/lib/site";

export const dynamic = "force-static";

export function GET() {
  const beats = BEATS.map((b) => ({
    id: b.id,
    name: readTitle(b.title).name,
    title: b.title,
    url: `${SITE}/beat/${b.id}`,
    store: storeUrl(b),
    art: artUrl(b),
    free: b.free,
    bpm: b.bpm,
    key: b.key,
    mood: b.mood,
    tags: b.tags,
    youtube: b.youtube,
    preview: b.preview ? new URL(b.preview, SITE).toString() : null,
    visualizer: b.visualizer,
  }));
  return Response.json({ version: 1, generated: new Date().toISOString(), count: beats.length, beats });
}
