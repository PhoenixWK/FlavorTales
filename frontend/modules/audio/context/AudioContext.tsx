"use client";

import { createContext, useContext, useRef } from "react";
import type { ReactNode, RefObject } from "react";
import type { AudioContextValue } from "@/modules/location/types/geofence";
import { useGeofencedAudio } from "@/modules/audio/hooks/useGeofencedAudio";
import { useGeofenceContext } from "@/modules/location/context/GeofenceContext";
import { useAnonymousSession } from "@/modules/location/hooks/useAnonymousSession";

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
  const { sessionId, sessionData } = useAnonymousSession();
  const userLanguage = sessionData?.languagePreference ?? "vi";

  const audio = useGeofencedAudio(
    audioRef as RefObject<HTMLAudioElement | null>,
    resolvedPoiId,
    overlapActive,
    userLanguage,
    sessionId
  );

  const currentLanguage = userLanguage.substring(0, 2).toUpperCase();

  return (
    <AudioCtx.Provider value={{ ...audio, currentLanguage }}>
      {/* Single shared <audio> element for the entire tourist map session. */}
      <audio ref={audioRef} preload="none" aria-hidden="true" />
      {children}
    </AudioCtx.Provider>
  );
}
