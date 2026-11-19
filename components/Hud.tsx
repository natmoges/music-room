"use client";

/* The HUD: where everything happens. Read the catalog, search it, pick a beat, open the
   liner notes, and launch toward checkout. Lost signal lives here too. */
import { useMemo, useState } from "react";
import { type Beat, artUrl, readTitle } from "@/lib/catalog";
import { LICENSES, money } from "@/lib/licenses";
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
};

export default function Hud({ beats, selected, lost, onSelect, onLaunch, onJump }: Props) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [shown, setShown] = useState(PAGE);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return beats.filter((b) => {
      if (filter === "free" && !b.free) return false;
      if (filter === "lease" && b.free) return false;
      return !q || b.title.toLowerCase().includes(q);
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
        <article className={styles.focus} aria-live="polite">
          {selected.art && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className={styles.art} src={artUrl(selected)} alt="" width={96} height={96} />
          )}
          <div className={styles.meta}>
            <p className={styles.kicker}>{selected.free ? "FREE DOWNLOAD" : "NOW TUNED"}</p>
            <h1 className={styles.name}>{sel.name}</h1>
            {sel.after && <p className={styles.after}>{sel.after}</p>}
            <a className={styles.listen} href={`https://www.youtube.com/@NatFTP/search?query=${encodeURIComponent(sel.name)}`} target="_blank" rel="noreferrer">
              Hear it on the channel ↗
            </a>
          </div>

          {selected.free ? (
            <button className={styles.launch} onClick={() => onLaunch(selected, "free")}>Take it, free</button>
          ) : (
            <ol className={styles.notes}>
              {LICENSES.map((l) => (
                <li key={l.name}>
                  <button className={styles.license} onClick={() => onLaunch(selected, l.name)}>
                    <span className={styles.lname}>{l.name}</span>
                    <span className={styles.lfiles}>{l.files}</span>
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
          <input value={query} onChange={(e) => { setQuery(e.target.value); setShown(PAGE); }} placeholder="Search the transmission: artist, mood, title" />
        </label>
        <div className={styles.tabs} role="tablist" aria-label="Filter">
          {(["all", "lease", "free"] as Filter[]).map((f) => (
            <button key={f} role="tab" aria-selected={filter === f} className={filter === f ? styles.tabOn : styles.tab} onClick={() => { setFilter(f); setShown(PAGE); }}>
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
              <button className={selected?.id === b.id ? styles.rowOn : styles.row} onClick={() => onSelect(b)}>
                <span className={styles.rname}>{t.name}</span>
                <span className={styles.rafter}>{t.after}</span>
                <span className={styles.rtag}>{b.free ? "FREE" : "LEASE"}</span>
              </button>
            </li>
          );
        })}
        {results.length === 0 && <li className={styles.empty}>No signal for &ldquo;{query}&rdquo;.</li>}
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
