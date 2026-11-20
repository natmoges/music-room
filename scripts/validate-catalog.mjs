// Runs before every build (npm run build → prebuild). A beat that isn't ready stops the
// build with a plain message instead of shipping broken or disappearing quietly.
// The first 16 beats are frozen as they are; every beat after them must be complete.
import { readdirSync, readFileSync, existsSync } from "node:fs";

const FROZEN = new Set(["7398287", "7276475", "7091820", "6968876", "5498076", "5930624", "5648600", "5568380",
  "5541707", "5489698", "5223421", "5213555", "5205858", "5200324", "5062509", "5062407"]);
const dir = new URL("../data/beats/", import.meta.url);
const catalog = JSON.parse(readFileSync(new URL("../data/catalog.json", import.meta.url), "utf8"));
const inFeed = new Map(catalog.map((b) => [b.id, b]));
const errors = [];
const warnings = [];
let published = 0;

for (const name of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
  const where = `data/beats/${name}`;
  let b;
  try { b = JSON.parse(readFileSync(new URL(name, dir), "utf8")); } catch (e) { errors.push(`${where}: not valid JSON (${e.message})`); continue; }
  const id = name.replace(/\.json$/, "");
  if (b.id !== id) errors.push(`${where}: id "${b.id}" doesn't match the file name`);
  for (const k of ["mood", "tags"]) if (b[k] != null && !Array.isArray(b[k])) errors.push(`${where}: ${k} must be a list, like ["dark"]`);
  if (b.bpm != null && typeof b.bpm !== "number") errors.push(`${where}: bpm must be a number`);
  if (b.key != null && typeof b.key !== "string") errors.push(`${where}: key must be text, like "C#m"`);
  if (b.youtube != null && !/^[\w-]{11}$/.test(b.youtube)) errors.push(`${where}: youtube must be the 11-character video ID`);
  if (typeof b.preview === "string" && !/^https:\/\//.test(b.preview)) errors.push(`${where}: preview must be an https URL (or leave it null and put the file in public/previews/${id}.mp3)`);
  if (b.published === false) continue;
  published++;

  const feed = inFeed.get(id);
  if (!feed) { errors.push(`${where}: published, but not in the BeatStars feed. Download the feed, run npm run sync, then build again.`); continue; }
  if (!feed.licenses || Object.keys(feed.licenses).length === 0) warnings.push(`${id}: no licenses in the feed; the room will link straight to BeatStars`);
  if (FROZEN.has(id)) continue;

  const hasFile = existsSync(new URL(`../public/previews/${id}.mp3`, import.meta.url));
  if (!hasFile && !b.preview) errors.push(`${where}: new beat with no preview (public/previews/${id}.mp3 or a preview URL)`);
  if (!b.youtube) errors.push(`${where}: new beat with no YouTube ID`);
  if (typeof b.bpm !== "number") errors.push(`${where}: new beat with no BPM`);
  if (!b.key) errors.push(`${where}: new beat with no key`);
  if (!b.mood?.length) errors.push(`${where}: new beat with no mood`);
  if (!b.tags?.length) errors.push(`${where}: new beat with no tags`);
}

for (const w of warnings) console.warn(`  ! ${w}`);
if (errors.length) {
  console.error(`\nCatalog check failed (${errors.length}):\n${errors.map((e) => `  ✗ ${e}`).join("\n")}\n\nSet "published": false on a beat to hold it back while you finish it.\n`);
  process.exit(1);
}
console.log(`catalog check: ${published} published beats ready`);
