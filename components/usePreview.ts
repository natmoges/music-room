"use client";

/*
  The preview player. One audio element for the whole room, so only one beat ever plays.
  It plays the tagged preview from the beat's own file (my audio, hosted with the site).
  Before load: nothing plays. Tap play: it starts, the record turns. Pick another beat while
  one plays: the new one takes over. It ends: the record stops where it is. The browser
  refuses to play: the button says so and nothing pretends to be playing. The phone's lock
  screen gets the title and the artwork.
*/
import { useCallback, useEffect, useRef, useState } from "react";
import { type Beat, artUrl, readTitle } from "@/lib/catalog";

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
};

export function usePreview(beat: Beat | null): Preview {
  const audio = useRef<HTMLAudioElement | null>(null);
  const pending = useRef<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const a = new Audio();
    a.preload = "none";
    audio.current = a;
    const onTime = () => setProgress(a.duration ? a.currentTime / a.duration : 0);
    const onMeta = () => setDuration(a.duration || 0);
    const onPlay = () => { setPlaying(true); setBlocked(false); };
    const onPause = () => setPlaying(false);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("ended", onPause);
    return () => { a.pause(); a.src = ""; };
  }, []);

  const start = useCallback(async () => {
    const a = audio.current;
    if (!a) return;
    try { await a.play(); } catch { setBlocked(true); setPlaying(false); }
  }, []);

  // Load the tuned beat's preview whenever the beat changes.
  useEffect(() => {
    const a = audio.current;
    if (!a) return;
    a.pause();
    setProgress(0);
    setDuration(0);
    setBlocked(false);
    if (!beat?.preview) { a.removeAttribute("src"); a.load(); return; }
    a.src = beat.preview;
    if ("mediaSession" in navigator) {
      const { name, after } = readTitle(beat.title);
      navigator.mediaSession.metadata = new MediaMetadata({
        title: name, artist: "NatFromThisPlanet", album: after,
        artwork: beat.art ? [{ src: artUrl(beat), sizes: "600x600", type: "image/jpeg" }] : [],
      });
    }
    if (pending.current === beat.id) { pending.current = null; void start(); }
  }, [beat, start]);

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

  return { playing, blocked, progress, duration, has: !!beat?.preview, toggle, stop, seek, playWhenReady };
}
