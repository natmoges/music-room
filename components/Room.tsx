"use client";

/*
  The music room.

  You don't arrive at natftp.com, you drop out of hyperspace into it. While the page loads,
  the light stretches into bars and speeds up, faster and faster, and the jump ends as soon
  as the room is ready, so it never makes anyone wait. You come out in slow motion, like a
  ship leaving a portal, and land at the planet: NatFromThisPlanet, the music room of NatFTP.
  The HUD opens with it, like the start of a game, and that's where everything happens:
  playing, searching, choosing a beat, the outside links, buying.

  Coming from a YouTube link to one beat, the drop-out is short and you land with the HUD
  already open on that beat. Been here before, the jump is shorter. Hyperspace is always
  there: jump again and you come out at a random beat.

  Buying is a trip, not a button. Picking a license launches you out toward checkout, and
  the launch is the reward. No big red arrows. If a beat is gone, or the feed or the store
  is down, the HUD shows lost signal, same as the 404, with a way back.

  With reduced motion on, the room plays like my Pro Page video: the screen comes on with
  the glitch and retro effect, and the starfield drifts slow, no streaks. On a phone,
  everything bends toward browsing the catalog and acting on it.
*/
import { useCallback, useEffect, useState } from "react";
import { type Beat, storeUrl } from "@/lib/catalog";
import Hyperspace from "./Hyperspace";
import CrtBoot from "./CrtBoot";
import Starfield from "./Starfield";
import Planet from "./Planet";
import Hud from "./Hud";
import styles from "./Room.module.css";

type Entry = "home" | "beat";
type Phase = "arriving" | "landed" | "launching";

const VISITED = "nfp.visited";

// Fire-and-forget events for the tags already on the site (GA4, Meta, TikTok).
function track(name: string, data: Record<string, string>) {
  const w = window as unknown as { gtag?: Function; fbq?: Function; ttq?: { track: Function } };
  try {
    w.gtag?.("event", name, data);
    if (name === "begin_checkout") { w.fbq?.("track", "InitiateCheckout", data); w.ttq?.track("InitiateCheckout", data); }
  } catch { /* analytics never breaks the room */ }
}

export default function Room({ beats, entry, initial, lost = false }: { beats: Beat[]; entry: Entry; initial: Beat | null; lost?: boolean }) {
  const [phase, setPhase] = useState<Phase>("arriving");
  const [arrival, setArrival] = useState<number | null>(null);
  const [reduced, setReduced] = useState(false);
  const [selected, setSelected] = useState<Beat | null>(initial);
  const [isLost, setIsLost] = useState(lost);
  const [launch, setLaunch] = useState<{ to: () => void; ms: number } | null>(null);

  // Decide how long the jump is, once, on the client.
  useEffect(() => {
    const rm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setReduced(rm);
    let seen = false;
    try { seen = localStorage.getItem(VISITED) === "1"; localStorage.setItem(VISITED, "1"); } catch { /* private mode */ }
    setArrival(entry === "beat" || lost ? 500 : seen ? 800 : 2000);
  }, [entry, lost]);

  const landed = useCallback(() => setPhase("landed"), []);

  const select = useCallback((b: Beat) => {
    setSelected(b);
    setIsLost(false);
    try { history.replaceState(null, "", `/beat/${b.id}`); } catch { /* ignore */ }
    track("select_item", { item_id: b.id, item_name: b.title });
  }, []);

  const jump = useCallback(() => {
    if (!beats.length) return;
    const next = beats[Math.floor(Math.random() * beats.length)];
    track("jump", { item_id: next.id });
    setLaunch({ ms: reduced ? 0 : 700, to: () => { select(next); setLaunch(null); setArrival(500); setPhase("arriving"); } });
    setPhase("launching");
  }, [beats, reduced, select]);

  const onLaunch = useCallback((b: Beat, what: string) => {
    track("begin_checkout", { item_id: b.id, item_name: b.title, license: what });
    const go = () => { window.location.href = storeUrl(b); };
    setLaunch({ ms: reduced ? 0 : 900, to: go });
    setPhase("launching");
  }, [reduced]);

  useEffect(() => {
    if (phase === "launching" && launch && launch.ms === 0) {
      const t = setTimeout(launch.to, 250);
      return () => clearTimeout(t);
    }
  }, [phase, launch]);

  return (
    <main className={`${styles.room} ${phase === "landed" ? styles.landed : ""}`}>
      <Starfield reduced={reduced} />
      <div className={styles.stage}>
        <div className={styles.planetSlot}>
          <Planet onJump={jump} playing={!!selected} />
        </div>
        {phase !== "arriving" && (
          <Hud beats={beats} selected={selected} lost={isLost} onSelect={select} onLaunch={onLaunch} onJump={jump} />
        )}
      </div>

      {phase === "arriving" && arrival !== null && (reduced
        ? <CrtBoot onDone={landed} label="NATFROMTHISPLANET" />
        : <Hyperspace key={`a${arrival}${selected?.id}`} mode="arrive" duration={arrival} onDone={landed} />)}
      {phase === "arriving" && arrival === null && <div className={styles.hold} aria-hidden="true" />}
      {phase === "launching" && launch && (launch.ms > 0
        ? <Hyperspace mode="launch" duration={launch.ms} onDone={launch.to} />
        : <div className={styles.blink} aria-hidden="true" />)}
    </main>
  );
}
