"use client";

/*
  The reduced-motion arrival, the same as the Pro Page video: the screen switches on as one
  line, opens with a glitch, prints the boot text, and the room is there. No streaks.
*/
import { useEffect } from "react";
import styles from "./CrtBoot.module.css";

export default function CrtBoot({ onDone, label }: { onDone: () => void; label: string }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1400);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className={styles.screen} aria-hidden="true">
      <div className={styles.line} />
      <pre className={styles.text}>{`> SIGNAL DETECTED\n> ARCHIVE: PRODBYNAT 2018–2022 [SEALED]\n> ROOM: ${label} [ONLINE]`}</pre>
    </div>
  );
}
