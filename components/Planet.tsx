"use client";

/*
  NatFromThisPlanet. The planet from the portfolio, Accretion and the Pro Page hero: a dark
  core, a glowing rim, scanline bands, one satellite on its orbit. Tune a beat and the planet
  turns out to be a record: grooves come up, the beat's artwork becomes the label, and it
  turns at 23 RPM, the same as my vinyl. The small planets from the vinyl art ride the orbit.
  Touch it and you jump again.
*/
import styles from "./Planet.module.css";

type Props = { onJump: () => void; art: string | null };

const MOONS = ["#a47bd6", "#2b7fd9", "#e5372f", "#7cc242"];

export default function Planet({ onJump, art }: Props) {
  const tuned = !!art;
  return (
    <div className={`${styles.wrap} ${tuned ? styles.tuned : ""}`}>
      <svg className={styles.orbit} viewBox="0 0 400 400" aria-hidden="true">
        <ellipse cx="200" cy="200" rx="196" ry="58" transform="rotate(-16 200 200)" />
        <circle className={styles.sat} r="4">
          <animateMotion dur="16s" repeatCount="indefinite" path="M4,200 a196,58 -16 1,0 392,0 a196,58 -16 1,0 -392,0" />
        </circle>
        {MOONS.map((c, i) => (
          <circle key={c} className={styles.moon} r={i % 2 ? 5 : 3.5} fill={c}>
            <animateMotion dur={`${22 + i * 5}s`} begin={`-${i * 6}s`} repeatCount="indefinite" path="M4,200 a196,58 -16 1,0 392,0 a196,58 -16 1,0 -392,0" />
          </circle>
        ))}
      </svg>
      <button className={styles.planet} onClick={onJump} aria-label="Jump to a random beat">
        <span className={styles.bands} />
        <span className={styles.grooves} />
        <span className={styles.label} style={art ? { backgroundImage: `url("${art}")` } : undefined}>
          <span className={styles.hole} />
        </span>
        <span className={styles.rim} />
      </button>
      <p className={styles.caption}>
        <span>{tuned ? "NOW TURNING · 23 RPM" : "NATFROMTHISPLANET"}</span>
        <span>TOUCH TO JUMP</span>
      </p>
    </div>
  );
}
