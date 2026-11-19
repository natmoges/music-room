"use client";

/* NatFromThisPlanet. The planet from the portfolio and Accretion, now the music room's ground.
   Touch it and you jump again. */
import styles from "./Planet.module.css";

export default function Planet({ onJump, playing }: { onJump: () => void; playing: boolean }) {
  return (
    <div className={`${styles.wrap} ${playing ? styles.playing : ""}`}>
      <svg className={styles.orbit} viewBox="0 0 400 400" aria-hidden="true">
        <ellipse cx="200" cy="200" rx="190" ry="62" transform="rotate(-18 200 200)" />
        <circle className={styles.sat} r="4" cx="0" cy="0">
          <animateMotion dur="14s" repeatCount="indefinite" path="M10,200 a190,62 -18 1,0 380,0 a190,62 -18 1,0 -380,0" />
        </circle>
      </svg>
      <button className={styles.planet} onClick={onJump} aria-label="Jump to a random beat">
        <span className={styles.rings} />
      </button>
      <p className={styles.label}>
        <span>NATFROMTHISPLANET</span>
        <span>TOUCH TO JUMP</span>
      </p>
    </div>
  );
}
