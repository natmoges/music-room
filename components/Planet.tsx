"use client";

/*
  NatFromThisPlanet. The planet from the portfolio, Accretion and the Pro Page hero: a dark
  core, a glowing rim, scanline bands, one satellite on its orbit. Tune a beat and the planet
  turns out to be a record: grooves come up, the beat's artwork becomes the label, and it
  turns at 23 RPM while the preview plays, the same as my vinyl, and stops when it stops. The
  small planets from the vinyl art ride the orbit: a violet one, a ringed blue one, a red one and
  a green comet with its tail. Touch the planet and you jump to a random beat.
*/
import styles from "./Planet.module.css";

type Props = { onJump: () => void; art: string | null; spinning?: boolean };

const PATH = "M4,200 a196,58 -16 1,0 392,0 a196,58 -16 1,0 -392,0";
const MOONS = [
  { id: "violet", hi: "#d9c2f5", lo: "#4b2a78", r: 5, dur: 24 },
  { id: "blue", hi: "#9cc9ff", lo: "#123c7a", r: 7, dur: 31, ring: true },
  { id: "red", hi: "#ff9a8f", lo: "#6e1310", r: 4, dur: 38 },
];

export default function Planet({ onJump, art, spinning = false }: Props) {
  const tuned = !!art;
  return (
    <div className={`${styles.wrap} ${tuned ? styles.tuned : ""} ${spinning ? styles.spinning : ""}`}>
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
            {m.ring && <ellipse rx={m.r * 2} ry={m.r * 0.55} className={styles.ring} />}
            <circle r={m.r} fill={`url(#moon-${m.id})`} />
            {m.ring && <path d={`M${-m.r * 2},0 a${m.r * 2},${m.r * 0.55} 0 0,0 ${m.r * 4},0`} className={styles.ring} />}
            <animateMotion dur={`${m.dur}s`} begin={`-${i * 7}s`} repeatCount="indefinite" path={PATH} />
          </g>
        ))}
        <g className={styles.moon}>
          <path d="M-26,0 Q-10,-3 0,0 Q-10,3 -26,0Z" fill="url(#tail)" />
          <circle r="3" fill="#d6ffb0" />
          <animateMotion dur="19s" begin="-11s" repeatCount="indefinite" rotate="auto" path={PATH} />
        </g>
      </svg>
      <button className={styles.planet} onClick={onJump} aria-label="Jump to a random beat" title="Jump to a random beat">
        <span className={styles.bands} />
        <span className={styles.grooves} />
        <span className={styles.label} style={art ? { backgroundImage: `url("${art}")` } : undefined}>
          <span className={styles.hole} />
        </span>
        <span className={styles.rim} />
      </button>
      <p className={styles.caption}>
        <span>{spinning ? "NOW TURNING · 23 RPM" : tuned ? "TUNED · PRESS PLAY" : "NATFROMTHISPLANET"}</span>
        <span>TOUCH THE PLANET · RANDOM BEAT</span>
      </p>
    </div>
  );
}
