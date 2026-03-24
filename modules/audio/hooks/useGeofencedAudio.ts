"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import type { AudioPlayState } from "@/modules/location/types/geofence";
import { fetchPoiAudio } from "@/modules/poi/services/touristPoiApi";

/** NFR-GEO-R02: Minimum interval before replaying the same POI. */
const COOLDOWN_MS = 10 * 60 * 1_000; // 10 minutes

/** FR-LM-008 §3a: Audio continues this long after a normal zone exit. */
const NORMAL_EXIT_TRAIL_MS = 3_000;

/**
 * NFR-GEO-U03: In an overlap A→B transition, drain A naturally but
 * force-cut after this maximum.
 */
const OVERLAP_TRANSITION_MAX_MS = 15_000;

/** Fade duration before a forced stop. */
const FADE_MS = 500;

const COOLDOWN_KEY = "ft_audio_cooldown";

function readCooldowns(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(COOLDOWN_KEY) ?? "{}"); }
  catch { return {}; }
}
function saveCooldowns(r: Record<string, number>) {
  try { localStorage.setItem(COOLDOWN_KEY, JSON.stringify(r)); } catch { /* ignore */ }
}
function isOnCooldown(poiId: number): boolean {
  const ts = readCooldowns()[String(poiId)];
  return !!ts && Date.now() - ts < COOLDOWN_MS;
}
function markPlayed(poiId: number) {
  const r = readCooldowns();
  r[String(poiId)] = Date.now();
  saveCooldowns(r);
}

export interface UseGeofencedAudioResult {
  playState: AudioPlayState;
  currentPoiId: number | null;
  play: () => void;
  pause: () => void;
  stop: () => void;
}

/**
 * FR-LM-008: Controls audio playback triggered by geofence resolution.
 *
 * Transition modes:
 *  - Normal exit (resolvedPoiId → null while playing):
 *      trail for NORMAL_EXIT_TRAIL_MS then fade out.
 *  - Overlap A→B (resolvedPoiId A → B while overlapActive):
 *      drain A naturally; force-cut after OVERLAP_TRANSITION_MAX_MS;
 *      start B within < 1 s (NFR-GEO-U03).
 *
 * 10-minute per-POI cooldown stored in localStorage (NFR-GEO-R02).
 */
export function useGeofencedAudio(
  audioRef: RefObject<HTMLAudioElement | null>,
  resolvedPoiId: number | null,
  overlapActive: boolean,
  userLanguage: string,
  sessionId: string | null,
  onPlayedAudio?: (poiId: number, audioId: number) => void
): UseGeofencedAudioResult {
  const [playState, setPlayState] = useState<AudioPlayState>("idle");
  const [currentPoiId, setCurrentPoiId] = useState<number | null>(null);

  // ── All mutable state lives in a single ref (no stale-closure issues in timers) ──
  const st = useRef({
    playState: "idle" as AudioPlayState,
    currentPoiId: null as number | null,
    pendingPoiId: null as number | null,
    overlapWasActive: false,
    currentAudioId: null as number | null,
    finishTimer: null as ReturnType<typeof setTimeout> | null,
    fadeInterval: null as ReturnType<typeof setInterval> | null,
  });

  // Keep input refs current
  const resolvedPoiIdRef = useRef(resolvedPoiId);
  const overlapActiveRef = useRef(overlapActive);
  const userLanguageRef  = useRef(userLanguage);
  const sessionIdRef     = useRef(sessionId);
  const onPlayedRef      = useRef(onPlayedAudio);
  resolvedPoiIdRef.current = resolvedPoiId;
  overlapActiveRef.current = overlapActive;
  userLanguageRef.current  = userLanguage;
  sessionIdRef.current     = sessionId;
  onPlayedRef.current      = onPlayedAudio;

  const syncState = useCallback(
    (ps: AudioPlayState, poiId: number | null = st.current.currentPoiId) => {
      st.current.playState    = ps;
      st.current.currentPoiId = poiId;
      setPlayState(ps);
      setCurrentPoiId(poiId);
    },
    []
  );

  const clearFinishTimer = useCallback(() => {
    if (st.current.finishTimer) {
      clearTimeout(st.current.finishTimer);
      st.current.finishTimer = null;
    }
    if (st.current.fadeInterval) {
      clearInterval(st.current.fadeInterval);
      st.current.fadeInterval = null;
    }
  }, []);

  /** Smooth volume fade then fully stop playback. */
  const fadeOutAndStop = useCallback(
    (afterMs = 0) => {
      clearFinishTimer();
      const doFade = () => {
        const el = audioRef.current;
        if (!el) { syncState("idle", null); return; }
        const startVol = el.volume;
        const steps    = 10;
        const stepMs   = FADE_MS / steps;
        let step = 0;
        st.current.fadeInterval = setInterval(() => {
          step++;
          if (el && step < steps) {
            el.volume = Math.max(0, startVol * (1 - step / steps));
          } else {
            clearInterval(st.current.fadeInterval!);
            st.current.fadeInterval = null;
            if (el) { el.pause(); el.src = ""; el.volume = 1; el.onended = null; }
            st.current.pendingPoiId = null;
            syncState("idle", null);
          }
        }, stepMs);
      };

      if (afterMs > 0) {
        st.current.finishTimer = setTimeout(doFade, afterMs);
      } else {
        doFade();
      }
    },
    [audioRef, clearFinishTimer, syncState]
  );

  // Forward‑declared via ref so loadAndPlay can call itself via onended
  const loadAndPlayRef = useRef<(poiId: number) => Promise<void>>(() => Promise.resolve());

  const loadAndPlay = useCallback(
    async (poiId: number) => {
      syncState("loading", poiId);

      if (isOnCooldown(poiId)) {
        syncState("idle", null);
        return;
      }

      let tracks;
      try {
        tracks = await fetchPoiAudio(poiId);
      } catch {
        syncState("idle", null);
        return;
      }

      const lang  = userLanguageRef.current.substring(0, 2).toLowerCase();
      const track =
        tracks.find((a) => a.status === "active" && a.languageCode === lang) ??
        tracks.find((a) => a.status === "active" && a.languageCode === "vi");

      if (!track) { syncState("idle", null); return; }

      const el = audioRef.current;
      if (!el) { syncState("idle", null); return; }

      el.src    = track.fileUrl;
      el.volume = 1;
      st.current.currentAudioId = track.audioId;

      try {
        await el.play();
      } catch {
        syncState("idle", null);
        return;
      }

      syncState("playing", poiId);

      el.onended = () => {
        markPlayed(poiId);
        if (onPlayedRef.current && st.current.currentAudioId) {
          onPlayedRef.current(poiId, st.current.currentAudioId);
        }
        clearFinishTimer();
        const pending = st.current.pendingPoiId;
        st.current.pendingPoiId = null;
        if (pending !== null) {
          loadAndPlayRef.current(pending);
        } else {
          syncState("idle", null);
        }
      };
    },
    [audioRef, clearFinishTimer, syncState]
  );

  loadAndPlayRef.current = loadAndPlay;

  // ── Watch resolvedPoiId transitions ────────────────────────────────────────
  const prevResolvedRef = useRef<number | null>(null);

  useEffect(() => {
    const prev = prevResolvedRef.current;
    const next = resolvedPoiId;
    prevResolvedRef.current = next;

    // Track overlap history for transition decisions
    if (overlapActive) st.current.overlapWasActive = true;

    if (prev === next) return;

    const { playState: ps } = st.current;
    const isActive =
      ps === "playing" || ps === "finishing" || ps === "loading";

    // ── Normal exit: all POIs left ──────────────────────────────────────────
    if (prev !== null && next === null && isActive) {
      syncState("finishing");
      clearFinishTimer();
      st.current.finishTimer = setTimeout(
        () => fadeOutAndStop(),
        NORMAL_EXIT_TRAIL_MS
      );
      return;
    }

    // ── Transition A → B ────────────────────────────────────────────────────
    if (prev !== null && next !== null && prev !== next && isActive) {
      const wasOverlap = st.current.overlapWasActive;
      st.current.overlapWasActive = overlapActive;
      st.current.pendingPoiId = next;

      if (wasOverlap) {
        // NFR-GEO-U03: Drain A naturally; force-cut after max 15 s
        syncState("finishing");
        clearFinishTimer();
        st.current.finishTimer = setTimeout(() => {
          const el = audioRef.current;
          if (el) { el.onended = null; el.pause(); el.src = ""; el.volume = 1; }
          const pending = st.current.pendingPoiId;
          st.current.pendingPoiId = null;
          syncState("idle", null);
          if (pending !== null) loadAndPlayRef.current(pending);
        }, OVERLAP_TRANSITION_MAX_MS);
        // Natural audio end is handled by el.onended (triggers pendingPoiId)
      } else {
        // Non-overlap zone change: 3 s trail then switch
        syncState("finishing");
        clearFinishTimer();
        st.current.finishTimer = setTimeout(() => {
          const el = audioRef.current;
          if (el) { el.onended = null; el.pause(); el.src = ""; el.volume = 1; }
          const pending = st.current.pendingPoiId;
          st.current.pendingPoiId = null;
          syncState("idle", null);
          if (pending !== null) loadAndPlayRef.current(pending);
        }, NORMAL_EXIT_TRAIL_MS);
      }
      return;
    }

    if (!overlapActive) st.current.overlapWasActive = false;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedPoiId, overlapActive]);

  // Cleanup
  useEffect(() => {
    return () => {
      clearFinishTimer();
      const el = audioRef.current;
      if (el) { el.pause(); el.src = ""; el.onended = null; el.volume = 1; }
    };
  }, [audioRef, clearFinishTimer]);

  const play = useCallback(() => {
    const poi = resolvedPoiIdRef.current;
    if (!poi) return;
    const ps = st.current.playState;
    if (ps === "paused") {
      audioRef.current?.play();
      syncState("playing");
      return;
    }
    if (ps === "playing" || ps === "loading") return;
    st.current.overlapWasActive = overlapActiveRef.current;
    loadAndPlay(poi);
  }, [audioRef, loadAndPlay, syncState]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
    syncState("paused");
  }, [audioRef, syncState]);

  const stop = useCallback(() => {
    clearFinishTimer();
    const el = audioRef.current;
    if (el) { el.onended = null; el.pause(); el.src = ""; el.volume = 1; }
    st.current.pendingPoiId = null;
    syncState("idle", null);
  }, [audioRef, clearFinishTimer, syncState]);

  return { playState, currentPoiId, play, pause, stop };
}
