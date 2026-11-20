"use client";

/*
  NatFromThisPlanet. The planet from the portfolio, Accretion and the Pro Page hero: a dark
  core, a glowing rim, scanline bands, one satellite on its orbit. Tune a beat and the planet
  turns out to be a record: grooves come up, the beat's artwork becomes the label, and it
  turns at 23 RPM while the preview plays, the same as my vinyl, and stops when it stops. The
  small planets from the vinyl art ride the orbit: a violet one, a ringed blue one, a red one and
  a green comet with its tail. Touch the planet and you jump to a random beat.
*/
import { type MutableRefObject, useEffect, useRef, useState } from "react";
import styles from "./Planet.module.css";

/*
  The planet listens. While a preview plays it reads the low end (where the 808 and the kick
  live), the middle and the top, every frame. The low end pushes the record and throws a ring
  off the rim on the hardest hits; the middle lights the orbit; the top makes the moons
  shimmer. Each band is measured against its own recent loudest, so a quiet beat still moves
  and a loud one doesn't just sit at full. Hits come up fast and fall away slow, like a meter.
  The light takes its colour from the beat's artwork when the browser lets the art be read.
  Paused: everything settles. Reduced motion: none of it moves.
*/
function useListening(wrap: MutableRefObject<HTMLDivElement | null>, analyser: MutableRefObject<AnalyserNode | null> | undefined, on: boolean) {
  useEffect(() => {
    const el = wrap.current;
    if (!el || !analyser) return;
    if (!on || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.style.setProperty("--kick", "0"); el.style.setProperty("--mid", "0"); el.style.setProperty("--high", "0");
      return;
    }
    let raf = 0;
    const peak = { low: 0.2, mid: 0.2, high: 0.2 };
    const env = { low: 0, mid: 0, high: 0 };
    let data: Uint8Array<ArrayBuffer> | null = null;
    const band = (a: number, b: number) => { let s = 0; for (let i = a; i < b; i++) s += data![i]; return s / ((b - a) * 255); };
    const frame = () => {
      const node = analyser.current;
      if (node) {
        if (!data || data.length !== node.frequencyBinCount) data = new Uint8Array(node.frequencyBinCount);
        node.getByteFrequencyData(data);
        const now = { low: band(1, 4), mid: band(5, 40), high: band(40, 160) }; // ~40–170 Hz · 200 Hz–1.7 kHz · 1.7–7 kHz
        for (const k of ["low", "mid", "high"] as const) {
          peak[k] = Math.max(now[k], peak[k] * 0.995, 0.08);
          const n = Math.max(0, (now[k] / peak[k] - 0.55) / 0.45); // only the top of each band's range counts
          env[k] = n > env[k] ? n : env[k] * (k === "low" ? 0.86 : 0.92);
        }
        el.style.setProperty("--kick", env.low.toFixed(3));
        el.style.setProperty("--mid", env.mid.toFixed(3));
        el.style.setProperty("--high", env.high.toFixed(3));
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); el.style.setProperty("--kick", "0"); el.style.setProperty("--mid", "0"); el.style.setProperty("--high", "0"); };
  }, [wrap, analyser, on]);
}

// The average colour of the artwork's brighter, more saturated pixels becomes the glow.
function useArtTint(wrap: MutableRefObject<HTMLDivElement | null>, art: string | null) {
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    el.style.removeProperty("--tint");
    if (!art || art === "none") return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const c = document.createElement("canvas"); c.width = c.height = 24;
        const g = c.getContext("2d", { willReadFrequently: true })!;
        g.drawImage(img, 0, 0, 24, 24);
        const px = g.getImageData(0, 0, 24, 24).data;
        let r = 0, gg = 0, b = 0, w = 0;
        for (let i = 0; i < px.length; i += 4) {
          const mx = Math.max(px[i], px[i + 1], px[i + 2]), mn = Math.min(px[i], px[i + 1], px[i + 2]);
          const weight = (mx - mn) * (mx / 255); // saturated and bright counts most
          r += px[i] * weight; gg += px[i + 1] * weight; b += px[i + 2] * weight; w += weight;
        }
        if (w > 200) el.style.setProperty("--tint", `rgb(${Math.round(r / w)} ${Math.round(gg / w)} ${Math.round(b / w)})`);
      } catch { /* the art host didn't allow reading it: keep the house teal */ }
    };
    img.src = art;
  }, [wrap, art]);
}

type Scratch = { grab: () => void; scrub: (s: number) => void; release: () => void; onNeedle?: (cb: ((s: number, r: number) => void) | null) => void };
type Props = {
  onJump: () => void; art: string | null; spinning?: boolean; analyser?: MutableRefObject<AnalyserNode | null>;
  rate?: number; scratch?: Scratch | null; onTune?: () => void;
};

// One turn of the record at 23 RPM is about 2.6 seconds of the beat.
const TURN = 60 / 23;

const PATH = "M4,200 a196,58 -16 1,0 392,0 a196,58 -16 1,0 -392,0";
const MOONS = [
  { id: "violet", hi: "#d9c2f5", lo: "#4b2a78", r: 5, dur: 24 },
  { id: "blue", hi: "#9cc9ff", lo: "#123c7a", r: 7, dur: 31, ring: true },
  { id: "red", hi: "#ff9a8f", lo: "#6e1310", r: 4, dur: 38 },
];

export default function Planet({ onJump, art, spinning = false, analyser, rate = 1, scratch = null, onTune }: Props) {
  const tuned = !!art;
  const wrap = useRef<HTMLDivElement>(null);
  useListening(wrap, analyser, spinning);
  useArtTint(wrap, art);

  // The hand on the record: press to brake it, drag to scratch, let go to spin back up. A quick
  // tap without a drag still jumps to a random beat. While the hand is on, the record is drawn
  // from where the needle really is, so it visibly slows, stops and turns with the hand.
  const disc = useRef<HTMLButtonElement>(null);
  const drag = useRef({ down: false, moved: false, angle: 0, turned: 0, x: 0, y: 0, t: 0, base: 0, needle0: -1 });
  const [scratching, setScratching] = useState(false);
  const angleAt = (e: React.PointerEvent) => {
    const r = disc.current!.getBoundingClientRect();
    return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2));
  };
  const currentTurn = () => {
    const g = disc.current?.querySelector(`.${styles.grooves}`);
    const m = g ? getComputedStyle(g).transform : "none";
    if (!m || m === "none") return 0;
    const v = m.match(/matrix\(([^)]+)\)/)?.[1].split(",").map(Number);
    return v ? (Math.atan2(v[1], v[0]) * 180) / Math.PI : 0;
  };
  const onDown = (e: React.PointerEvent) => {
    if (!scratch || !tuned) return;
    drag.current = { down: true, moved: false, angle: angleAt(e), turned: 0, x: e.clientX, y: e.clientY, t: performance.now(), base: currentTurn(), needle0: -1 };
    disc.current?.setPointerCapture(e.pointerId);
    disc.current?.style.setProperty("--hand", `${drag.current.base}deg`);
    setScratching(true);
    scratch.onNeedle?.((sec) => {
      const d = drag.current;
      if (d.needle0 < 0) d.needle0 = sec;
      disc.current?.style.setProperty("--hand", `${d.base + ((sec - d.needle0) / TURN) * 360}deg`);
    });
    scratch.grab();
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d.down || !scratch) return;
    if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 6) { d.angle = angleAt(e); return; }
    d.moved = true;
    const a = angleAt(e);
    let delta = a - d.angle;
    if (delta > Math.PI) delta -= 2 * Math.PI;
    if (delta < -Math.PI) delta += 2 * Math.PI;
    d.angle = a;
    scratch.scrub((delta / (2 * Math.PI)) * TURN);
  };
  const onUp = () => {
    const d = drag.current;
    if (!d.down) return;
    d.down = false;
    const tap = !d.moved && performance.now() - d.t < 220;
    scratch?.release();
    // Hand the turning back to the motor from the angle the hand left it at.
    const turn = parseFloat(disc.current?.style.getPropertyValue("--hand") || "0");
    const period = 2.6 / rate;
    disc.current?.style.setProperty("--delay", `${-(((turn % 360) + 360) % 360 / 360) * period}s`);
    setTimeout(() => scratch?.onNeedle?.(null), 600);
    setScratching(false);
    justScratched.current = !tap;
  };
  const justScratched = useRef(false);
  return (
    <div ref={wrap} className={`${styles.wrap} ${tuned ? styles.tuned : ""} ${spinning ? styles.spinning : ""} ${scratching ? styles.scratching : ""}`} style={{ ["--turn" as string]: `${(2.6 / rate).toFixed(3)}s` }}>
      <svg className={styles.orbit} viewBox="0 0 400 400" aria-hidden="true">
        <ellipse cx="200" cy="200" rx="196" ry="58" transform="rotate(-16 200 200)" />
        <circle className={styles.sat} r="4">
          <animateMotion dur="16s" repeatCount="indefinite" path={PATH} />
        </circle>
        <defs>
          {MOONS.map((m) => (
            <radialGradient key={m.id} id={`moon-${m.id}`} cx="35%" cy="30%" r="75%">
              <stop offset="0" stopColor={m.hi} /><stop offset="1" stopColor={m.lo} />
            </radialGradient>
          ))}
          <linearGradient id="tail" x1="0" x2="1"><stop offset="0" stopColor="#7cc242" stopOpacity="0" /><stop offset="1" stopColor="#b6f07a" stopOpacity="0.85" /></linearGradient>
        </defs>
        {MOONS.map((m, i) => (
          <g key={m.id} className={styles.moon}>
            <g className={styles.shimmer}>
            {m.ring && <ellipse rx={m.r * 2} ry={m.r * 0.55} className={styles.ring} />}
            <circle r={m.r} fill={`url(#moon-${m.id})`} />
            {m.ring && <path d={`M${-m.r * 2},0 a${m.r * 2},${m.r * 0.55} 0 0,0 ${m.r * 4},0`} className={styles.ring} />}
            </g>
            <animateMotion dur={`${m.dur}s`} begin={`-${i * 7}s`} repeatCount="indefinite" path={PATH} />
          </g>
        ))}
        <g className={styles.moon}>
          <path d="M-26,0 Q-10,-3 0,0 Q-10,3 -26,0Z" fill="url(#tail)" />
          <circle r="3" fill="#d6ffb0" />
          <animateMotion dur="19s" begin="-11s" repeatCount="indefinite" rotate="auto" path={PATH} />
        </g>
      </svg>
      <button ref={disc} className={styles.planet} onClick={() => { if (justScratched.current) { justScratched.current = false; return; } onJump(); }}
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
        aria-label="Jump to a random beat. Hold and drag the record to scratch." title="Tap: random beat · Hold and drag: scratch">
        <span className={styles.bands} />
        <span className={styles.grooves} />
        <span className={styles.label} style={art ? { backgroundImage: `url("${art}")` } : undefined}>
          <span className={styles.hole} />
        </span>
        <span className={styles.rim} />
      </button>
      <span className={styles.wave} aria-hidden="true" />
      <p className={styles.caption}>
        {tuned && onTune ? (
          <button className={styles.tuneBtn} onClick={onTune} aria-label="Open tempo and key">
            {spinning ? `NOW TURNING · ${(23 * rate).toFixed(rate === 1 ? 0 : 1)} RPM` : "TUNED"} · TEMPO / KEY
          </button>
        ) : <span>{spinning ? "NOW TURNING · 23 RPM" : tuned ? "TUNED · PRESS PLAY" : "NATFROMTHISPLANET"}</span>}
        <span>{tuned ? "TAP: RANDOM BEAT · DRAG: SCRATCH" : "TOUCH THE PLANET · RANDOM BEAT"}</span>
      </p>
    </div>
  );
}
