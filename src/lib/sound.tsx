"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "mjfird:sound-enabled";

type SoundContextValue = {
  enabled: boolean;
  toggle: () => void;
  playTick: () => void;
  playWhoosh: () => void;
};

const SoundContext = createContext<SoundContextValue | null>(null);

export function SoundProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    // localStorage only exists client-side, so this can't be a lazy useState
    // initializer (that would run during SSR and throw) — it must be an effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEnabled(localStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  const getContext = useCallback(() => {
    if (!ctxRef.current) {
      const AudioCtor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctxRef.current = new AudioCtor();
    }
    return ctxRef.current;
  }, []);

  const playTone = useCallback(
    (freq: number, duration: number, gain: number) => {
      if (!enabled) return;
      const ctx = getContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = freq;
      gainNode.gain.setValueAtTime(gain, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.start();
      oscillator.stop(ctx.currentTime + duration);
    },
    [enabled, getContext],
  );

  const playTick = useCallback(() => playTone(1200, 0.05, 0.04), [playTone]);
  const playWhoosh = useCallback(() => playTone(400, 0.18, 0.05), [playTone]);

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }, []);

  return (
    <SoundContext.Provider value={{ enabled, toggle, playTick, playWhoosh }}>
      {children}
    </SoundContext.Provider>
  );
}

export function useSound() {
  const ctx = useContext(SoundContext);
  if (!ctx) throw new Error("useSound must be used within SoundProvider");
  return ctx;
}
