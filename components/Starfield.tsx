"use client";

/* The calm sky the room sits in after the jump. Slower still with reduced motion. */
import { useEffect, useRef } from "react";
import styles from "./Starfield.module.css";

export default function Starfield({ reduced }: { reduced: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0, h = 0, raf = 0;
    const resize = () => {
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);
    const stars = Array.from({ length: w < 700 ? 140 : 320 }, () => ({
      x: Math.random(), y: Math.random(), r: Math.random() * 1.2 + 0.2, v: Math.random() * 0.6 + 0.2, tw: Math.random() * 6.28,
    }));
    const drift = reduced ? 0.000008 : 0.00004;
    const loop = (now: number) => {
      ctx.clearRect(0, 0, w, h);
      for (const s of stars) {
        s.x -= drift * s.v * 16;
        if (s.x < 0) s.x += 1;
        const a = 0.35 + 0.35 * Math.sin(now / 1400 + s.tw);
        ctx.fillStyle = `rgba(217,217,217,${a})`;
        ctx.beginPath(); ctx.arc(s.x * w, s.y * h, s.r, 0, 6.283); ctx.fill();
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, [reduced]);
  return <canvas ref={ref} className={styles.sky} aria-hidden="true" />;
}
