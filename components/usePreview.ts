"use client";

/*
  The preview player. One audio element for the whole room, so only one beat ever plays.
  It plays the tagged preview from the beat's own file (my audio, hosted with the site).
  Before load: nothing plays. Tap play: it starts, the record turns. Pick another beat while
  one plays: the new one takes over. It ends: the record stops where it is. The browser
  refuses to play: the button says so and nothing pretends to be playing. The phone's lock
  screen gets the title and the artwork.
*/
import { type MutableRefObject, useCallback, useEffect, useRef, useState } from "react";
import { type Beat, artUrl, readTitle } from "@/lib/catalog";
import { track } from "@/lib/track";
import { makeShifter } from "@/lib/shifter";

// Trying the beat on: tempo (±15%), in "key" mode (pitch held) or "vinyl" mode (pitch rides
// with speed, like a turntable), plus a key shift of ±3 semitones in key mode. Nothing here
// touches the file anyone buys; it only changes how the tagged preview plays in this room.
export type Tune = { tempo: number; mode: "key" | "vinyl"; semis: number };
export const UNTUNED: Tune = { tempo: 0, mode: "key", semis: 0 };

export type Preview = {
  playing: boolean;
  blocked: boolean;
  progress: number; // 0..1
  duration: number;
  has: boolean;
  toggle: () => void;
  stop: () => void;
  seek: (fraction: number) => void;
  playWhenReady: (id: string) => void;
  // The ear the planet listens through: frequency data while a preview plays.
  analyser: MutableRefObject<AnalyserNode | null>;
  tune: Tune;
  setTune: (t: Tune) => void;
  canShift: boolean;
  rate: number; // the playback speed the tune works out to
  // Scratching: hold the record, drag it, let go.
  grab: () => void;
  scrub: (seconds: number) => void;
  release: () => void;
};

export function usePreview(beat: Beat | null): Preview {
  const audio = useRef<HTMLAudioElement | null>(null);
  const pending = useRef<string | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const ctx = useRef<AudioContext | null>(null);
  const heard = useRef({ id: "", half: false, done: false });
  const current = useRef<Beat | null>(null);
  current.current = beat;
  const [playing, setPlaying] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [tune, setTuneState] = useState<Tune>(UNTUNED);
  const tuneRef = useRef<Tune>(UNTUNED);
  const shifter = useRef<AudioWorkletNode | null>(null);
  const [canShift, setCanShift] = useState(false);
  const scratch = useRef({ on: false, was: false, grain: 0 as ReturnType<typeof setTimeout> | 0 });
  const rate = 1 + tune.tempo / 100;

  // Apply a tune to the element and the shifter.
  const apply = useCallback((t: Tune) => {
    const a = audio.current;
    if (!a) return;
    const r = 1 + t.tempo / 100;
    a.preservesPitch = t.mode === "key";
    a.playbackRate = r;
    const ratio = t.mode === "key" ? Math.pow(2, t.semis / 12) : 1;
    shifter.current?.parameters.get("ratio")?.setValueAtTime(ratio, shifter.current.context.currentTime);
  }, []);
  const setTune = useCallback((t: Tune) => {
    const clean: Tune = { tempo: Math.max(-15, Math.min(15, Math.round(t.tempo))), mode: t.mode, semis: Math.max(-3, Math.min(3, Math.round(t.semis))) };
    tuneRef.current = clean; setTuneState(clean); apply(clean);
  }, [apply]);

  useEffect(() => {
    const a = new Audio();
    a.preload = "none";
    a.crossOrigin = "anonymous"; // previews on another host (R2 later) must send CORS headers
    audio.current = a;
    const onTime = () => {
      const f = a.duration ? a.currentTime / a.duration : 0;
      setProgress(f);
      const b = current.current, h = heard.current;
      if (!b || h.id !== b.id) return;
      if (f >= 0.5 && !h.half) { h.half = true; track("preview_progress", { item_id: b.id, item_name: readTitle(b.title).name, percent: 50 }); }
    };
    const onEnd = () => {
      const b = current.current, h = heard.current;
      if (b && h.id === b.id && !h.done) { h.done = true; track("preview_progress", { item_id: b.id, item_name: readTitle(b.title).name, percent: 100 }); }
    };
    const onMeta = () => setDuration(a.duration || 0);
    const onPlay = () => { setPlaying(true); setBlocked(false); };
    const onPause = () => setPlaying(false);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("ended", onPause);
    a.addEventListener("ended", onEnd);
    return () => { a.pause(); a.src = ""; };
  }, []);

  const start = useCallback(async () => {
    const a = audio.current;
    if (!a) return;
    // The analyser is wired on the first real play (browsers only allow audio after a tap).
    try {
      if (!ctx.current) {
        const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const c = new AC();
        const node = c.createAnalyser();
        node.fftSize = 1024;
        node.smoothingTimeConstant = 0.6;
        const src = c.createMediaElementSource(a);
        src.connect(node);
        node.connect(c.destination);
        ctx.current = c; analyser.current = node;
        // The key shifter loads after the sound has started (Safari only lets audio start straight from a tap).
        void makeShifter(c).then((shift) => {
          if (!shift) return;
          src.disconnect(); src.connect(shift); shift.connect(node);
          shifter.current = shift; setCanShift(true); apply(tuneRef.current);
        });
      }
      if (ctx.current.state === "suspended") await ctx.current.resume();
    } catch { /* no analyser: the audio still plays, the planet just doesn't react */ }
    try {
      await a.play();
      const b = current.current;
      if (b && heard.current.id !== b.id) { heard.current = { id: b.id, half: false, done: false }; track("preview_start", { item_id: b.id, item_name: readTitle(b.title).name }); }
    } catch { setBlocked(true); setPlaying(false); }
  }, [apply]);

  // Load the tuned beat's preview whenever the beat changes.
  useEffect(() => {
    const a = audio.current;
    if (!a) return;
    a.pause();
    setProgress(0);
    setDuration(0);
    setBlocked(false);
    tuneRef.current = { ...UNTUNED, mode: tuneRef.current.mode }; setTuneState(tuneRef.current);
    if (!beat?.preview) { a.removeAttribute("src"); a.load(); return; }
    a.src = beat.preview;
    apply(tuneRef.current);
    if ("mediaSession" in navigator) {
      const { name, after } = readTitle(beat.title);
      navigator.mediaSession.metadata = new MediaMetadata({
        title: name, artist: "NatFromThisPlanet", album: after,
        artwork: beat.art ? [{ src: artUrl(beat), sizes: "600x600", type: "image/jpeg" }] : [],
      });
    }
    if (pending.current === beat.id) { pending.current = null; void start(); }
  }, [beat, start, apply]);

  const toggle = useCallback(() => {
    const a = audio.current;
    if (!a || !a.src) return;
    if (a.paused) void start(); else a.pause();
  }, [start]);

  const stop = useCallback(() => { audio.current?.pause(); }, []);

  const seek = useCallback((f: number) => {
    const a = audio.current;
    if (a && a.duration) a.currentTime = Math.max(0, Math.min(1, f)) * a.duration;
  }, []);

  // Scratch: pause under the hand; each drag moves the needle and plays a short grain, so a
  // push forward sounds like the record running and a pull back stutters backwards. Let go and
  // it carries on exactly where the hand left it, at the tune it was set to.
  const grab = useCallback(() => {
    const a = audio.current;
    if (!a || !a.src || scratch.current.on) return;
    scratch.current.on = true; scratch.current.was = !a.paused;
    a.pause();
  }, []);
  const scrub = useCallback((s: number) => {
    const a = audio.current;
    if (!a || !scratch.current.on || !a.duration) return;
    a.currentTime = Math.max(0, Math.min(a.duration - 0.05, a.currentTime + (s < 0 ? s * 1.6 : 0)));
    a.preservesPitch = false;
    a.playbackRate = Math.max(0.5, Math.min(3, Math.abs(s) * 18));
    if (a.paused) void a.play().catch(() => {});
    if (scratch.current.grain) clearTimeout(scratch.current.grain);
    scratch.current.grain = setTimeout(() => a.pause(), 70);
  }, []);
  const release = useCallback(() => {
    const a = audio.current;
    if (!a || !scratch.current.on) return;
    if (scratch.current.grain) clearTimeout(scratch.current.grain);
    scratch.current.on = false;
    apply(tuneRef.current);
    if (scratch.current.was) void start(); else a.pause();
  }, [apply, start]);

  // A beat picked from the list starts on its own (the tap is the permission to play).
  const playWhenReady = useCallback((id: string) => { pending.current = id; }, []);

  // Space bar plays and pauses, unless someone is typing in the search.
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.code !== "Space" || t?.closest("input, textarea, button")) return;
      e.preventDefault();
      toggle();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [toggle]);

  return { playing: playing || scratch.current.on, blocked, progress, duration, has: !!beat?.preview, toggle, stop, seek, playWhenReady, analyser, tune, setTune, canShift, rate, grab, scrub, release };
}
