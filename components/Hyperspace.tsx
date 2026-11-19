"use client";

/*
  Hyperspace. Light stretches into bars and speeds up, faster and faster, until the jump
  breaks: a flash, then you come out in slow motion and the streaks shrink back into stars.
  mode "arrive" ends by revealing the room. mode "launch" ends at full speed, white, and
  hands off (to checkout, or to a random beat). It runs while the page is already usable;
  it never holds anything back.
*/
import { useEffect, useRef } from "react";
import styles from "./Hyperspace.module.css";

type Props = {
  mode: "arrive" | "launch";
  duration: number; // ms of acceleration before the break
  onDone: () => void;
};

type Star = { x: number; y: number; z: number; pz: number; hue: number };

const easeIn = (t: number) => t * t * t;
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

export default function Hyperspace({ mode, duration, onDone }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0, h = 0;
    const resize = () => {
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const count = w < 700 ? 260 : 620;
    const stars: Star[] = Array.from({ length: count }, () => {
      const z = Math.random();
      return { x: Math.random() * 2 - 1, y: Math.random() * 2 - 1, z, pz: z, hue: Math.random() };
    });

    const EXIT = 1100; // the slow-motion exit
    const start = performance.now();
    let raf = 0, finished = false;

    const frame = (now: number) => {
      const t = now - start;
      let speed: number, fade = 1, stretch = 1;
      if (t < duration) {
        speed = 0.004 + easeIn(t / duration) * 0.09; // faster and faster
      } else if (mode === "launch") {
        speed = 0.12;
        if (!finished) { finished = true; flashRef.current?.classList.add(styles.flashOn); setTimeout(() => doneRef.current(), 260); }
      } else {
        const e = Math.min((t - duration) / EXIT, 1);
        if (e < 0.02 && flashRef.current && !flashRef.current.classList.contains(styles.flashOn)) {
          flashRef.current.classList.add(styles.flashOn);
          setTimeout(() => flashRef.current?.classList.remove(styles.flashOn), 140);
        }
        speed = 0.0015 * (1 - easeOut(e)); // slow motion
        stretch = 1 - easeOut(e);
        fade = 1 - easeOut(e);
        if (e >= 1 && !finished) { finished = true; doneRef.current(); return; }
      }

      ctx.fillStyle = `rgba(4,6,8,${t < duration ? 0.35 : 0.6})`;
      ctx.fillRect(0, 0, w, h);
      const cx = w / 2, cy = h / 2, scale = Math.max(w, h) * 0.5;

      for (const s of stars) {
        s.pz = s.z;
        s.z -= speed;
        if (s.z <= 0.01) { s.x = Math.random() * 2 - 1; s.y = Math.random() * 2 - 1; s.z = 1; s.pz = 1; continue; }
        const sx = cx + (s.x / s.z) * scale * 0.5;
        const sy = cy + (s.y / s.z) * scale * 0.5;
        const pz = s.z + (s.pz - s.z) * (1 + stretch * 14);
        const px = cx + (s.x / pz) * scale * 0.5;
        const py = cy + (s.y / pz) * scale * 0.5;
        const a = Math.min(1, (1 - s.z) * 1.6) * fade;
        ctx.strokeStyle = s.hue > 0.82 ? `rgba(34,211,238,${a})` : s.hue > 0.7 ? `rgba(34,197,94,${a * 0.8})` : `rgba(230,236,240,${a})`;
        ctx.lineWidth = Math.max(0.6, (1 - s.z) * 2.4);
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(sx, sy); ctx.stroke();
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, [mode, duration]);

  return (
    <div className={`${styles.layer} ${mode === "arrive" ? styles.arrive : ""}`} style={{ ["--exit" as string]: `${duration}ms` }} aria-hidden="true">
      <canvas ref={canvasRef} className={styles.canvas} />
      <div ref={flashRef} className={styles.flash} />
    </div>
  );
}
