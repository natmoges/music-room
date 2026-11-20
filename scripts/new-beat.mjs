// npm run beat -- <beatstars-id or beat URL> [more…]
// Writes data/beats/<id>.json with every field present and empty, so a person, a script or
// an AI can fill it. Never overwrites a file that already exists.
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const ids = process.argv.slice(2).map((a) => a.match(/(\d+)\/?$/)?.[1]).filter(Boolean);
if (!ids.length) {
  console.error("usage: npm run beat -- <beatstars-id or beat URL> …");
  process.exit(1);
}

const catalog = JSON.parse(readFileSync(new URL("../data/catalog.json", import.meta.url), "utf8"));
for (const id of ids) {
  const file = new URL(`../data/beats/${id}.json`, import.meta.url);
  if (existsSync(file)) {
    console.log(`${id}: already there, left alone`);
    continue;
  }
  const inFeed = catalog.find((b) => b.id === id);
  if (!inFeed) console.warn(`${id}: not in data/catalog.json yet; download the feed and run npm run sync`);
  const beat = { id, published: true, bpm: null, key: null, mood: [], tags: [], youtube: null, preview: null, visualizer: null, note: "" };
  writeFileSync(file, JSON.stringify(beat, null, 2) + "\n");
  console.log(`${id}: written${inFeed ? ` (${inFeed.title})` : ""}`);
}
