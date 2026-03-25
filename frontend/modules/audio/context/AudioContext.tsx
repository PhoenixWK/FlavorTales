"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode, RefObject } from "react";
import type { AudioContextValue } from "@/modules/location/types/geofence";
import { useGeofencedAudio } from "@/modules/audio/hooks/useGeofencedAudio";
import { useGeofenceContext } from "@/modules/location/context/GeofenceContext";
import { useAnonymousSession } from "@/modules/location/hooks/useAnonymousSession";
import { useLocale } from "@/shared/hooks/useLocale";

const AudioCtx = createContext<AudioContextValue | null>(null);

export function useAudioContext(): AudioContextValue {
  const ctx = useContext(AudioCtx);
  if (!ctx) throw new Error("useAudioContext must be used inside AudioProvider");
  return ctx;
}

/**
 * FR-LM-008: Provides audio playback state to all descendants.
 * Owns the single HTMLAudioElement used throughout the tourist map session.
 * Must be rendered below GeofenceProvider.
 */
export function AudioProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { resolvedPoiId, overlapActive } = useGeofenceContext();
  const { sessionId, updateLanguage } = useAnonymousSession();
  const { locale } = useLocale();

  // Sync locale to backend session whenever the tourist changes language.
  const syncedLocaleRef = useRef<string | null>(null);
  useEffect(() => {
    if (syncedLocaleRef.current === locale) return;
    syncedLocaleRef.current = locale;
    updateLanguage(locale);
  }, [locale, updateLanguage]);

  const audio = useGeofencedAudio(
    audioRef as RefObject<HTMLAudioElement | null>,
    resolvedPoiId,
    overlapActive,
    locale,
    sessionId
  );

  const [progress, setProgress] = useState(0);

  // Reset progress when playback is fully stopped
  useEffect(() => {
    if (audio.playState === "idle") setProgress(0);
  }, [audio.playState]);

  // Attach timeupdate to the <audio> element after mount
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const handleTimeUpdate = () => {
      const dur = el.duration;
      setProgress(isFinite(dur) && dur > 0 ? el.currentTime / dur : 0);
    };
    el.addEventListener("timeupdate", handleTimeUpdate);
    return () => el.removeEventListener("timeupdate", handleTimeUpdate);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const seek = useCallback((fraction: number) => {
    const el = audioRef.current;
    if (!el || !isFinite(el.duration)) return;
    el.currentTime = Math.max(0, Math.min(1, fraction)) * el.duration;
  }, []);

  return (
    <AudioCtx.Provider value={{ ...audio, progress, seek }}>
      {/* Single shared <audio> element for the entire tourist map session. */}
      <audio ref={audioRef} preload="none" aria-hidden="true" />
      {children}
    </AudioCtx.Provider>
  );
}
