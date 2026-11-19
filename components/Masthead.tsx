/* The wordmark in its HUD frame, the same transmission card as the Pro Page hero. */
import styles from "./Masthead.module.css";

export default function Masthead({ locked }: { locked: boolean }) {
  return (
    <header className={styles.card}>
      <p className={styles.row}>
        <span>INCOMING TRANSMISSION</span>
        <span className={locked ? styles.locked : styles.searching}>{locked ? "● SIGNAL LOCKED" : "○ SEARCHING"}</span>
        <span>N 39.95 W 75.16</span>
      </p>
      <p className={styles.word}>NatFromThisPlanet</p>
      <p className={styles.row}>
        <span>ORIGIN // PHILADELPHIA, 215</span>
        <span>BEATS / VISION / MOTION</span>
      </p>
    </header>
  );
}
