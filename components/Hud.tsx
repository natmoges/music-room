"use client";

/* The HUD: where everything happens. Read the catalog, search it, pick a beat, open the
   liner notes, and launch toward checkout. Lost signal lives here too. */
import { useEffect, useMemo, useRef, useState } from "react";
import { type Beat, artUrl, listenUrl, readTitle, storeUrl } from "@/lib/catalog";
import type { Preview } from "./usePreview";
import { licensesFor, money } from "@/lib/licenses";
import { LINKS, PRO_ROOM, TUNE_IN } from "@/lib/site";
import styles from "./Hud.module.css";

type Filter = "all" | "lease" | "free";
const PAGE = 24;

type Props = {
  beats: Beat[];
  selected: Beat | null;
  lost: boolean;
  onSelect: (b: Beat) => void;
  onLaunch: (b: Beat, what: string) => void;
  onJump: () => void;
  player: Preview;
};

export default function Hud({ beats, selected, lost, onSelect, onLaunch, onJump, player }: Props) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [shown, setShown] = useState(PAGE);
  const focusRef = useRef<HTMLElement>(null);
  const headRef = useRef<HTMLHeadingElement>(null);
  const wantFocus = useRef(false);
  // After a pick from the list, bring the tuned card into view once it exists, and move focus to it.
  useEffect(() => {
    if (!wantFocus.current || !selected) return;
    wantFocus.current = false;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    headRef.current?.focus({ preventScroll: true });
    focusRef.current?.scrollIntoView({ behavior: still ? "auto" : "smooth", block: "start" });
  }, [selected]);

  const results = useMemo(() => {
    // Every word has to land somewhere: title, artist, mood, tags, BPM or key.
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    return beats.filter((b) => {
      if (filter === "free" && !b.free) return false;
      if (filter === "lease" && b.free) return false;
      const hay = [b.title, ...b.mood, ...b.tags, b.bpm ? `${b.bpm} ${b.bpm}bpm` : "", b.key ?? ""].join(" ").toLowerCase();
      return words.every((w) => hay.includes(w));
    });
  }, [beats, query, filter]);

  const sel = selected ? readTitle(selected.title) : null;

  return (
    <section className={styles.hud} aria-label="Beat catalog">
      <header className={styles.top}>
        <span className={styles.dot} aria-hidden="true" />
        <span>NATFROMTHISPLANET</span>
        <span className={styles.count}>{beats.length} TRANSMISSIONS</span>
      </header>

      {lost && (
        <div className={styles.lost} role="status">
          <p className={styles.kicker}>LINK: LOST</p>
          <p>Lost signal. That beat isn&apos;t here anymore, or the link is wrong.</p>
          <button className={styles.ghost} onClick={onJump}>Jump to a random beat</button>
        </div>
      )}

      {selected && sel && (
        <article ref={focusRef} className={styles.focus} aria-live="polite">
          {selected.art && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className={styles.art} src={artUrl(selected)} alt="" width={96} height={96} />
          )}
          <div className={styles.meta}>
            <p className={styles.kicker}>{selected.free ? "FREE DOWNLOAD" : "NOW TUNED"}{selected.bpm ? ` · ${selected.bpm} BPM` : ""}{selected.key ? ` · ${selected.key}` : ""}</p>
            <h1 ref={headRef} tabIndex={-1} className={styles.name}>{sel.name}</h1>
            {sel.after && <p className={styles.after}>{sel.after}</p>}
            {player.has ? (
              <div className={styles.player}>
                <button className={styles.play} onClick={player.toggle} aria-label={player.playing ? "Pause preview" : "Play preview"}>
                  {player.playing ? "❚❚" : "▶"}
                </button>
                <input className={styles.seek} type="range" min={0} max={1000} value={Math.round(player.progress * 1000)}
                  onChange={(e) => player.seek(Number(e.target.value) / 1000)} aria-label="Seek preview" />
                {player.blocked && <span className={styles.hint}>tap play</span>}
              </div>
            ) : (
              <p className={styles.hint}>Preview lands here soon.</p>
            )}
            <a className={styles.listen} href={listenUrl(selected)} target="_blank" rel="noreferrer">
              {selected.youtube ? "Watch on YouTube ↗" : "Find it on YouTube ↗"}
            </a>
          </div>

          {selected.free ? (
            <button className={styles.launch} onClick={() => onLaunch(selected, "free")}>Take it, free</button>
          ) : (
            <ol className={styles.notes}>
              {licensesFor(selected.licenses).length === 0 && <li><a className={styles.license} href={storeUrl(selected)}>See licenses on BeatStars ↗</a></li>}
              {licensesFor(selected.licenses).map((l) => (
                <li key={l.name}>
                  <button className={styles.license} onClick={() => onLaunch(selected, l.name)}>
                    <span className={styles.lname}>{l.name}</span>
                    <span className={styles.lfiles}>{l.files} · {l.note}</span>
                    <span className={styles.lprice}>{l.price === null ? "Offer" : money(l.price)}</span>
                  </button>
                </li>
              ))}
            </ol>
          )}
        </article>
      )}

      <div className={styles.controls}>
        <label className={styles.search}>
          <span className={styles.srOnly}>Search the transmission</span>
          <input value={query} onChange={(e) => { setQuery(e.target.value); setShown(PAGE); }} placeholder="Search beats: artist, title, BPM, key" />
          <span className={styles.srOnly} role="status">{results.length} beats</span>
        </label>
        <div className={styles.tabs} role="group" aria-label="Filter">
          {(["all", "lease", "free"] as Filter[]).filter((f) => f !== "free" || beats.some((b) => b.free)).map((f) => (
            <button key={f} aria-pressed={filter === f} className={filter === f ? styles.tabOn : styles.tab} onClick={() => { setFilter(f); setShown(PAGE); }}>
              {f.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <ul className={styles.list}>
        {results.slice(0, shown).map((b) => {
          const t = readTitle(b.title);
          return (
            <li key={b.id}>
              <button className={selected?.id === b.id ? styles.rowOn : styles.row} aria-current={selected?.id === b.id ? "true" : undefined} onClick={() => { onSelect(b); wantFocus.current = true; }}>
                <span className={styles.rname}>{t.name}</span>
                <span className={styles.rafter}>{t.after}</span>
                <span className={styles.rtag}>{b.free ? "FREE" : "LEASE"}</span>
              </button>
            </li>
          );
        })}
        {results.length === 0 && <li className={styles.empty}>{query ? <>No signal for &ldquo;{query}&rdquo;. <button className={styles.clear} onClick={() => setQuery("")}>Clear search</button></> : "Nothing here yet."}</li>}
      </ul>
      {results.length > shown && (
        <button className={styles.ghost} onClick={() => setShown((n) => n + PAGE)}>
          Show more ({results.length - shown})
        </button>
      )}

      <footer className={styles.bottom}>
        <a href={TUNE_IN} target="_blank" rel="noreferrer" className={styles.tune}>Tune in: the January drops, by email ↗</a>
        <nav className={styles.links} aria-label="Elsewhere">
          {LINKS.map((l) => <a key={l.label} href={l.href} target="_blank" rel="noreferrer">{l.label}</a>)}
        </nav>
        <p className={styles.house}>A NatFTP room. Transmitting from Philadelphia, 215. · <a href={PRO_ROOM}>The professional room</a></p>
      </footer>
    </section>
  );
}
