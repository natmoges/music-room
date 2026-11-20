"use client";

/* The HUD: where everything happens. Read the catalog, search it, pick a beat, open the
   liner notes, and launch toward checkout. Lost signal lives here too. */
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  tuneOpen: boolean;
  setTuneOpen: (open: boolean) => void;
};

// "A minor", "a min", "C♯m", "Db major" all find the same beats as "Am", "C#m", "Dbmaj".
function normalizeQuery(q: string) {
  return q.toLowerCase()
    .replace(/♯/g, "#").replace(/♭/g, "b")
    .replace(/\b([a-g])\s*(#|b)?\s*(minor|min)\b/g, "$1$2m")
    .replace(/\b([a-g])\s*(#|b)?\s*(major|maj)\b/g, "$1$2maj")
    .replace(/\bbpm\b/g, "");
}

export default function Hud({ beats, selected, lost, onSelect, onLaunch, onJump, player, tuneOpen, setTuneOpen }: Props) {
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
    const words = normalizeQuery(query).split(/\s+/).filter(Boolean);
    return beats.filter((b) => {
      if (filter === "free" && !b.free) return false;
      if (filter === "lease" && b.free) return false;
      if (mood && !b.mood.some((m) => m.toLowerCase() === mood)) return false;
      const hay = [b.title, ...b.mood, ...b.tags, b.bpm ? `${b.bpm} ${b.bpm}bpm` : "", b.key ?? ""].join(" ").toLowerCase();
      return words.every((w) => hay.includes(w));
    });
  }, [beats, query, filter, mood]);

  const sel = selected ? readTitle(selected.title) : null;
  const t = player.tune;
  const tuned = t.tempo !== 0 || t.semis !== 0;
  const bpmNow = selected?.bpm ? Math.round(selected.bpm * player.rate) : null;
  const vinylSemis = 12 * Math.log2(player.rate);
  const tuneLine = tuned
    ? [bpmNow ? `${bpmNow} BPM` : `${t.tempo > 0 ? "+" : ""}${t.tempo}% tempo`,
       t.mode === "key" ? (t.semis ? `${t.semis > 0 ? "+" : ""}${t.semis} key` : "same key") : `vinyl (${vinylSemis > 0 ? "+" : ""}${vinylSemis.toFixed(1)} st)`].join(" · ")
    : "";
  const setT = (next: Partial<typeof t>) => {
    const n = { ...t, ...next };
    player.setTune(n);
    if (selected) track("tune", { item_id: selected.id, tempo: n.tempo, mode: n.mode, semis: n.semis });
  };

  return (
    <section className={styles.hud} aria-label="Beat catalog">
      <header className={styles.top}>
        <span className={styles.dot} aria-hidden="true" />
        <span>NATFROMTHISPLANET</span>
        <span className={styles.count}>{beats.length} TRANSMISSIONS</span>
      </header>
      <a href={TUNE_IN} target="_blank" rel="noreferrer" className={styles.invite} onClick={() => track("list_invite_click", { place: "header" })}>
        First listen to new beats, by email ↗
      </a>

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
            {player.has && (
              <button className={styles.tuneToggle} aria-expanded={tuneOpen} onClick={() => setTuneOpen(!tuneOpen)}>
                {tuned ? `Tuned: ${tuneLine}` : "Try it faster, slower or in another key"} {tuneOpen ? "▴" : "▾"}
              </button>
            )}
            <a className={styles.listen} href={listenUrl(selected)} target="_blank" rel="noreferrer">
              {selected.youtube ? "Watch on YouTube ↗" : "Find it on YouTube ↗"}
            </a>
          </div>

          {player.has && tuneOpen && (
            <div className={styles.tune} role="group" aria-label="Tempo and key">
              <label className={styles.tuneRow}>
                <span>Tempo <b>{bpmNow ? `${bpmNow} BPM` : `${t.tempo > 0 ? "+" : ""}${t.tempo}%`}</b>{bpmNow && t.tempo ? <i> ({t.tempo > 0 ? "+" : ""}{t.tempo}%)</i> : null}</span>
                <input type="range" min={-15} max={15} step={1} value={t.tempo} onChange={(e) => setT({ tempo: Number(e.target.value) })}
                  aria-valuetext={bpmNow ? `${bpmNow} BPM` : `${t.tempo} percent`} />
              </label>
              <div className={styles.tuneModes} role="radiogroup" aria-label="How the speed changes">
                <button role="radio" aria-checked={t.mode === "key"} className={t.mode === "key" ? styles.tabOn : styles.tab} onClick={() => setT({ mode: "key" })}>KEEP KEY</button>
                <button role="radio" aria-checked={t.mode === "vinyl"} className={t.mode === "vinyl" ? styles.tabOn : styles.tab} onClick={() => setT({ mode: "vinyl", semis: 0 })}>VINYL</button>
              </div>
              {t.mode === "key" ? (
                <label className={styles.tuneRow}>
                  <span>Key <b>{t.semis === 0 ? "original" : `${t.semis > 0 ? "+" : ""}${t.semis} semitone${Math.abs(t.semis) > 1 ? "s" : ""}`}</b>{selected.key ? <i> (from {selected.key})</i> : null}</span>
                  <input type="range" min={-3} max={3} step={1} value={t.semis} disabled={!player.canShift} onChange={(e) => setT({ semis: Number(e.target.value) })}
                    aria-valuetext={`${t.semis} semitones`} />
                </label>
              ) : (
                <p className={styles.hint}>Vinyl: pitch rides with the speed, like a turntable ({vinylSemis > 0 ? "+" : ""}{vinylSemis.toFixed(1)} semitones).</p>
              )}
              <div className={styles.tuneFoot}>
                <span className={styles.hint}>Just for trying it on. Any license is for the original file; any DAW or engineer can match this.</span>
                <button className={styles.clear} onClick={() => setT({ tempo: 0, semis: 0 })} disabled={!tuned}>Reset</button>
              </div>
            </div>
          )}

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
              {selected.freeDownload && (
                <li className={styles.freeRow}>
                  <a className={styles.listen} href={storeUrl(selected, "free download")} onClick={() => track("free_download", { item_id: selected.id, item_name: sel.name })}>
                    Free tagged download (personal use) on BeatStars ↗
                  </a>
                </li>
              )}
            </ol>
          )}

          {terms && (
            <div className={styles.terms} role="dialog" aria-modal="false" aria-labelledby="terms-title">
              <p className={styles.kicker}>BEFORE YOU GO</p>
              <h2 id="terms-title" className={styles.tname}>{terms.name} · {terms.price === null ? "Offer" : money(terms.price)}</h2>
              <ul className={styles.tlist}>{(TERMS[terms.key] ?? []).map((t) => <li key={t}>{t}</li>)}</ul>
              {tuned && <p className={styles.tnote}>You tried it at <b>{tuneLine}</b>. The file you get is the original; set the same in your session.</p>}
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

      {selected && sel && cardGone && typeof document !== "undefined" && createPortal(
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
        </div>,
        document.body,
      )}

      <footer className={styles.bottom}>
        <a href={TUNE_IN} target="_blank" rel="noreferrer" className={styles.tune}>First listen to new beats, by email ↗</a>
        <nav className={styles.links} aria-label="Elsewhere">
          {LINKS.map((l) => <a key={l.label} href={l.href} target="_blank" rel="noreferrer">{l.label}</a>)}
        </nav>
        <p className={styles.house}>A NatFTP room. Transmitting from Philadelphia, 215. · <a href={PRO_ROOM}>The professional room</a></p>
      </footer>
    </section>
  );
}
