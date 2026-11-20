"use client";

/* The HUD: where everything happens. Read the catalog, search it, pick a beat, open the
   liner notes, and launch toward checkout. Lost signal lives here too. */
import { useEffect, useMemo, useRef, useState } from "react";
import { type Beat, artUrl, listenUrl, readTitle, storeUrl } from "@/lib/catalog";
import type { Preview } from "./usePreview";
import { type License, TERMS, licensesFor, money } from "@/lib/licenses";
import { LINKS, PRO_ROOM, STORE, TUNE_IN } from "@/lib/site";
import { track } from "@/lib/track";
import styles from "./Hud.module.css";

type Filter = "all" | "lease" | "free";
const PAGE = 24;

type Props = {
  beats: Beat[];
  selected: Beat | null;
  lost: boolean;
  onSelect: (b: Beat) => void;
  onLaunch: (b: Beat, what: string, value?: number) => void;
  onJump: () => void;
  player: Preview;
};

export default function Hud({ beats, selected, lost, onSelect, onLaunch, onJump, player }: Props) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [mood, setMood] = useState<string | null>(null);
  const [terms, setTerms] = useState<License | null>(null);
  const [cardGone, setCardGone] = useState(false);
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

  // Moods come from the beats themselves: a chip appears once any beat carries that mood.
  const moods = useMemo(() => {
    const n = new Map<string, number>();
    for (const b of beats) for (const m of b.mood) n.set(m.toLowerCase(), (n.get(m.toLowerCase()) ?? 0) + 1);
    return [...n.entries()].sort((a, b) => b[1] - a[1]).map(([m]) => m);
  }, [beats]);

  // The terms sheet: opens on a license, closes on Escape or Back, focus goes to Continue.
  const goRef = useRef<HTMLButtonElement>(null);
  const openTerms = (l: License) => {
    if (!selected) return;
    setTerms(l);
    track("view_terms", { item_id: selected.id, item_name: readTitle(selected.title).name, license: l.name, value: l.price ?? undefined });
  };
  useEffect(() => {
    if (!terms) return;
    goRef.current?.focus();
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setTerms(null); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [terms]);
  useEffect(() => { setTerms(null); }, [selected]);

  // On a phone, once the tuned card scrolls away, a mini-player holds the beat at the bottom.
  useEffect(() => {
    const el = focusRef.current;
    if (!el || !("IntersectionObserver" in window)) { setCardGone(false); return; }
    const io = new IntersectionObserver(([e]) => setCardGone(!e.isIntersecting), { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, [selected]);

  // Searches are logged once typing settles, so the log shows what people look for.
  useEffect(() => {
    const q = query.trim();
    if (!q) return;
    const t = setTimeout(() => track("search", { search_term: q }), 900);
    return () => clearTimeout(t);
  }, [query]);

  const results = useMemo(() => {
    // Every word has to land somewhere: title, artist, mood, tags, BPM or key.
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    return beats.filter((b) => {
      if (filter === "free" && !b.free) return false;
      if (filter === "lease" && b.free) return false;
      if (mood && !b.mood.some((m) => m.toLowerCase() === mood)) return false;
      const hay = [b.title, ...b.mood, ...b.tags, b.bpm ? `${b.bpm} ${b.bpm}bpm` : "", b.key ?? ""].join(" ").toLowerCase();
      return words.every((w) => hay.includes(w));
    });
  }, [beats, query, filter, mood]);

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
                  <button className={styles.license} onClick={() => openTerms(l)} aria-haspopup="dialog">
                    <span className={styles.lname}>{l.name}</span>
                    <span className={styles.lfiles}>{l.files} · {l.note}</span>
                    <span className={styles.lprice}>{l.price === null ? "Offer" : money(l.price)}</span>
                  </button>
                </li>
              ))}
            </ol>
          )}

          {terms && (
            <div className={styles.terms} role="dialog" aria-modal="false" aria-labelledby="terms-title">
              <p className={styles.kicker}>BEFORE YOU GO</p>
              <h2 id="terms-title" className={styles.tname}>{terms.name} · {terms.price === null ? "Offer" : money(terms.price)}</h2>
              <ul className={styles.tlist}>{(TERMS[terms.key] ?? []).map((t) => <li key={t}>{t}</li>)}</ul>
              <p className={styles.tnote}>Checkout, payment and file delivery happen on BeatStars. You&apos;ll pick this license there again and see the full contract before paying.</p>
              <a className={styles.listen} href={`${STORE}/licensing-info`} target="_blank" rel="noreferrer">Read the full license terms ↗</a>
              <div className={styles.tactions}>
                <button className={styles.ghost} onClick={() => setTerms(null)}>Back</button>
                <button ref={goRef} className={styles.launch} onClick={() => { const l = terms; setTerms(null); onLaunch(selected, l.name, l.price ?? undefined); }}>
                  Continue to BeatStars
                </button>
              </div>
            </div>
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
        {moods.length > 0 && (
          <div className={styles.tabs} role="group" aria-label="Mood">
            {moods.map((m) => (
              <button key={m} aria-pressed={mood === m} className={mood === m ? styles.tabOn : styles.tab}
                onClick={() => { const next = mood === m ? null : m; setMood(next); setShown(PAGE); if (next) track("filter_mood", { mood: next }); }}>
                {m.toUpperCase()}
              </button>
            ))}
          </div>
        )}
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

      {selected && sel && cardGone && (
        <div className={styles.mini} role="region" aria-label="Now playing">
          {selected.art && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={artUrl(selected)} alt="" width={40} height={40} />
          )}
          <button className={styles.miniName} onClick={() => { headRef.current?.focus({ preventScroll: true }); focusRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>
            <strong>{sel.name}</strong><span>Licenses ↑</span>
          </button>
          {player.has && (
            <button className={styles.play} onClick={player.toggle} aria-label={player.playing ? "Pause preview" : "Play preview"}>
              {player.playing ? "❚❚" : "▶"}
            </button>
          )}
          <span className={styles.miniBar} style={{ transform: `scaleX(${player.progress})` }} aria-hidden="true" />
        </div>
      )}

      <footer className={styles.bottom}>
        <a href={TUNE_IN} target="_blank" rel="noreferrer" className={styles.tune}>Tune in: new drops, by email ↗</a>
        <nav className={styles.links} aria-label="Elsewhere">
          {LINKS.map((l) => <a key={l.label} href={l.href} target="_blank" rel="noreferrer">{l.label}</a>)}
        </nav>
        <p className={styles.house}>A NatFTP room. Transmitting from Philadelphia, 215. · <a href={PRO_ROOM}>The professional room</a></p>
      </footer>
    </section>
  );
}
