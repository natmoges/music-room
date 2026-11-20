// Turns the BeatStars catalog feed (the same CSV Meta's catalog reads every hour) into
// data/catalog.json, one row per beat. BeatStars refuses scripted requests, so the feed is
// downloaded in the browser and saved as data/feed.csv; this reads that file. If it isn't
// there, it tries the feed directly; if that fails too, the last good copy stays.
import { readFile, writeFile, access } from "node:fs/promises";
import { readFileSync } from "node:fs";

const FEED =
  "https://main.v2.beatstars.com/fb/catalog/be0aba966998a648372b680a9f46a62b73d5a4054872adf93b9b6e33c0e696f1";
const OUT = new URL("../data/catalog.json", import.meta.url);
const SAMPLE = new URL("../data/sample-catalog.json", import.meta.url);
const LOCAL = new URL("../data/feed.csv", import.meta.url);

// The feed is CSV with every field quoted. One row per beat per license.
function parseCsv(text) {
  const rows = [];
  for (const line of text.trim().split("\n").slice(1)) {
    const cells = [...line.matchAll(/"((?:[^"]|"")*)"/g)].map((m) => m[1].replace(/""/g, '"'));
    if (cells.length > 20) rows.push(cells);
  }
  return rows;
}

function toCatalog(rows) {
  const beats = new Map();
  for (const r of rows) {
    const id = r[0].split("-")[1];
    const link = r[14] ?? "";
    const fullSlug = link.split("/beat/")[1] ?? id;
    const price = Number.parseFloat(r[19]);
    if (!Number.isFinite(price) || price < 0) { process.exitCode = 1; throw new Error(`bad price "${r[19]}" on ${r[0]}; feed rejected, last good catalog kept`); }
    const beat = beats.get(id) ?? {
      id,
      slug: fullSlug.replace(new RegExp(`-${id}$`), ""),
      title: r[1].replace(/ \((?:Basic|Premium|Trackout|Unlimited|Exclusive)[\s\S]*\)\s*$/, "").trim(),
      art: (r[15].split("/track/artwork/")[1] ?? ""),
      prices: [],
      licenses: {},
    };
    beat.prices.push(price);
    const kind = r[1].match(/\((Basic|Premium|Trackout|Unlimited|Exclusive)/);
    if (kind) beat.licenses[kind[1].toLowerCase()] = price;
    else console.warn(`unknown license on ${r[0]}: ${r[1]}`);
    beats.set(id, beat);
  }
  return [...beats.values()].map(({ prices, ...b }) => ({ ...b, free: prices.every((p) => p === 0) }));
}

async function exists(u) {
  try { await access(u); return true; } catch { return false; }
}

async function readFeed() {
  if (await exists(LOCAL)) return { text: await readFile(LOCAL, "utf8"), from: "data/feed.csv" };
  const res = await fetch(FEED, { signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`feed answered ${res.status}; download it in the browser and save it as data/feed.csv`);
  return { text: await res.text(), from: "the feed" };
}

try {
  const { text, from } = await readFeed();
  const catalog = toCatalog(parseCsv(text));
  if (catalog.length === 0) throw new Error("feed was empty");
  // A feed that suddenly lost a lot of beats is more likely broken than true. Refuse it.
  let before = 0;
  try { before = JSON.parse(await readFile(OUT, "utf8")).length; } catch { /* first run */ }
  // Any beat that is up in the room must still be in the feed; otherwise its buy links break.
  const { readdirSync } = await import("node:fs");
  const live = readdirSync(new URL("../data/beats/", import.meta.url)).filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(new URL(`../data/beats/${f}`, import.meta.url), "utf8")))
    .filter((b) => b.published !== false).map((b) => String(b.id));
  const ids = new Set(catalog.map((b) => b.id));
  const gone = live.filter((id) => !ids.has(id));
  if (gone.length && !process.argv.includes("--allow-removals")) {
    process.exitCode = 1;
    throw new Error(`the feed is missing beats that are up in the room: ${gone.join(", ")}. Check BeatStars, or set them to published: false.`);
  }
  if (before && catalog.length < before * 0.9 && !process.argv.includes("--allow-removals")) {
    process.exitCode = 1;
    throw new Error(`feed has ${catalog.length} beats, the catalog had ${before}. If that's on purpose, run: npm run sync -- --allow-removals`);
  }
  await writeFile(OUT, JSON.stringify(catalog, null, 1) + "\n");
  console.log(`catalog: ${catalog.length} beats from ${from}`);
} catch (err) {
  if (await exists(OUT)) {
    console.warn(`catalog: feed unreachable (${err.message}); keeping the last good copy`);
  } else {
    await writeFile(OUT, await readFile(SAMPLE));
    console.warn(`catalog: feed unreachable (${err.message}); using the sample`);
  }
}
