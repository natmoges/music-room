// Pulls the catalog from the BeatStars feed (the same file Meta's catalog reads every hour)
// and writes data/catalog.json, one row per beat. If the feed can't be reached, the last
// good copy stays; if there is none, the sample is used so the build never breaks.
import { readFile, writeFile, access } from "node:fs/promises";

const FEED =
  "https://main.v2.beatstars.com/fb/catalog/be0aba966998a648372b680a9f46a62b73d5a4054872adf93b9b6e33c0e696f1";
const OUT = new URL("../data/catalog.json", import.meta.url);
const SAMPLE = new URL("../data/sample-catalog.json", import.meta.url);

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
    const price = parseFloat(r[19]) || 0;
    const beat = beats.get(id) ?? {
      id,
      slug: fullSlug.replace(new RegExp(`-${id}$`), ""),
      title: r[1].replace(/ \((Basic|Premium)[^)]*\)\s*$/, "").trim(),
      art: (r[15].split("/track/artwork/")[1] ?? ""),
      prices: [],
    };
    beat.prices.push(price);
    beats.set(id, beat);
  }
  return [...beats.values()].map(({ prices, ...b }) => ({ ...b, free: prices.every((p) => p === 0) }));
}

async function exists(u) {
  try { await access(u); return true; } catch { return false; }
}

try {
  const res = await fetch(FEED, { signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`feed answered ${res.status}`);
  const catalog = toCatalog(parseCsv(await res.text()));
  if (catalog.length === 0) throw new Error("feed was empty");
  await writeFile(OUT, JSON.stringify(catalog, null, 1) + "\n");
  console.log(`catalog: ${catalog.length} beats from the feed`);
} catch (err) {
  if (await exists(OUT)) {
    console.warn(`catalog: feed unreachable (${err.message}); keeping the last good copy`);
  } else {
    await writeFile(OUT, await readFile(SAMPLE));
    console.warn(`catalog: feed unreachable (${err.message}); using the sample`);
  }
}
