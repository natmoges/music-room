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
import { type ScratchEngine, makeScratch } from "@/lib/scratch";

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
  onNeedle: (cb: ((seconds: number, rate: number) => void) | null) => void;
  needleNow: () => number;
};

export function usePreview(beat: Beat | null): Preview {
  const audio = useRef<HTMLAudioElement | null>(null);
  const pending = useRef<string | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const ctx = useRef<AudioContext | null>(null);
  const heard = useRef({ id: "", half: false, done: false, secs: 0 });
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
  const scratch = useRef({ on: false, was: false, grain: 0 as ReturnType<typeof setTimeout> | 0, last: 0, idle: 0 as ReturnType<typeof setTimeout> | 0 });
  const engine = useRef<ScratchEngine | null>(null);
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
    let lastT = 0, lastWall = 0;
    const onTime = () => {
      const f = a.duration ? a.currentTime / a.duration : 0;
      setProgress(f);
      // Count time actually heard, not where the playhead was dragged to.
      const now = performance.now();
      const dt = a.currentTime - lastT, wall = (now - lastWall) / 1000;
      if (!a.paused && dt > 0 && dt < Math.max(1.5, wall * 2 + 0.5)) heard.current.secs += dt;
      lastT = a.currentTime; lastWall = now;
      const b = current.current, h = heard.current;
      if (!b || h.id !== b.id) return;
      if (a.duration && h.secs >= a.duration * 0.5 && !h.half) { h.half = true; track("preview_progress", { item_id: b.id, item_name: readTitle(b.title).name, percent: 50 }); }
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
        // The scratch engine plays into the same analyser, so the planet still reacts while scratching.
        void makeScratch(c, node).then((eng) => {
          engine.current = eng;
          const b = current.current;
          if (eng && b?.preview) void eng.load(b.preview);
        });
      }
      if (ctx.current.state === "suspended") await ctx.current.resume();
    } catch { /* no analyser: the audio still plays, the planet just doesn't react */ }
    try {
      await a.play();
      const b = current.current;
      if (b && heard.current.id !== b.id) { heard.current = { id: b.id, half: false, done: false, secs: 0 }; track("preview_start", { item_id: b.id, item_name: readTitle(b.title).name }); }
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
    if (!beat?.preview) { a.removeAttribute("src"); a.load(); void engine.current?.load(""); return; }
    a.src = beat.preview;
    apply(tuneRef.current);
    if (engine.current) void engine.current.load(beat.preview);
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

  // The hand on the record. Press and hold: like a palm laid lightly on a spinning platter, the
  // record drags down over about a second, pitch falling with it, until it's choked to a stop.
  // Move while holding: the record follows the hand, forward or back. Hold still again: it
  // settles to a stop under the hand. Let go: the motor pulls it back up to speed and the
  // normal player takes over from wherever the needle is. Grab again mid spin-up: the hand wins.
  const handoff = useRef<ReturnType<typeof setTimeout> | 0>(0);
  const grab = useCallback(() => {
    const a = audio.current;
    if (!a || !a.src || scratch.current.on) return;
    scratch.current.on = true; scratch.current.last = performance.now();
    const eng = engine.current;
    if (handoff.current) { clearTimeout(handoff.current); handoff.current = 0; eng?.brake(0.9); return; }
    scratch.current.was = !a.paused;
    if (eng?.ready() && !a.paused) {
      eng.start(a.currentTime, a.playbackRate);
      a.pause();
      eng.brake(1.3); // the palm: about 1.3 s from full speed to a choke
    } else {
      a.pause();
      if (eng?.ready()) eng.start(a.currentTime, 0);
    }
  }, []);
  const scrub = useCallback((s: number) => {
    const a = audio.current;
    const eng = engine.current;
    if (!a || !scratch.current.on || !eng?.ready()) return;
    const now = performance.now();
    const dt = Math.max(8, now - scratch.current.last) / 1000;
    scratch.current.last = now;
    eng.setRate(Math.max(-4, Math.min(4, s / dt)), 0.012);
    if (scratch.current.idle) clearTimeout(scratch.current.idle);
    scratch.current.idle = setTimeout(() => eng.setRate(0, 0.09), 70);
  }, []);
  const release = useCallback(() => {
    const a = audio.current;
    if (!a || !scratch.current.on) return;
    if (scratch.current.idle) clearTimeout(scratch.current.idle);
    scratch.current.on = false;
    const eng = engine.current;
    const target = 1 + tuneRef.current.tempo / 100;
    const finish = () => {
      handoff.current = 0;
      apply(tuneRef.current);
      const go = () => { if (scratch.current.was) void start(); else a.pause(); };
      if (eng?.ready()) void eng.stop().then((pos) => { if (pos >= 0 && a.duration) a.currentTime = Math.min(pos, a.duration - 0.05); go(); });
      else go();
    };
    if (eng?.ready() && scratch.current.was) {
      eng.setRate(target, 0.18); // the motor catches it and pulls it back to speed
      handoff.current = setTimeout(finish, 520);
    } else finish();
  }, [apply, start]);
  const onNeedle = useCallback((cb: ((seconds: number, rate: number) => void) | null) => { engine.current?.onPos(cb); }, []);

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

  return { playing: playing || scratch.current.on, blocked, progress, duration, has: !!beat?.preview, toggle, stop, seek, playWhenReady, analyser, tune, setTune, canShift, rate, grab, scrub, release, onNeedle, needleNow: () => audio.current?.currentTime ?? 0 };
}
