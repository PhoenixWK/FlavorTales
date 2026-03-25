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
  playForPoi: (poiId: number) => void;
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
            if (el) { el.pause(); el.src = ""; el.volume = 1; el.onended = null; el.onerror = null; }
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

  // Generation counter: incremented each time loadAndPlay starts a new call.
  // Ensures only the most-recent invocation proceeds past async operations.
  const loadGenerationRef = useRef(0);

  // Forward‑declared via ref so loadAndPlay can call itself via onended
  const loadAndPlayRef = useRef<(poiId: number, force?: boolean) => Promise<void>>(() => Promise.resolve());

  // Stable handler refs: store the latest onended/onerror callbacks so play()
  // can re-attach them after they are cleared following an error.
  const onEndedHandlerRef = useRef<(() => void) | null>(null);
  const onErrorHandlerRef = useRef<(() => void) | null>(null);

  const loadAndPlay = useCallback(
    async (poiId: number, force = false) => {
      if (!force && isOnCooldown(poiId)) return;

      const gen = ++loadGenerationRef.current;
      syncState("loading", poiId);

      let tracks;
      try {
        tracks = await fetchPoiAudio(poiId);
      } catch {
        // Keep bar visible as "paused" so user can tap play to retry.
        if (gen === loadGenerationRef.current) syncState("paused", poiId);
        return;
      }

      // Reject stale calls: a newer loadAndPlay started, or the state machine
      // transitioned away (stop / exit trail / forced finish).
      if (
        gen !== loadGenerationRef.current ||
        st.current.playState !== "loading" ||
        st.current.currentPoiId !== poiId
      ) {
        return;
      }

      const lang  = userLanguageRef.current.substring(0, 2).toLowerCase();
      const track =
        tracks.find((a) => a.status === "active" && a.languageCode.toLowerCase() === lang) ??
        tracks.find((a) => a.status === "active" && a.languageCode.toLowerCase() === "vi");

      // No active audio for this POI/language — stay visible so user can retry.
      if (!track) { syncState("paused", poiId); return; }

      const el = audioRef.current;
      if (!el) { syncState("idle", null); return; }

      // Route through the Next.js proxy so the server can sign the request
      // with AWS SigV4 before forwarding to the private R2 bucket. Direct
      // browser requests to R2 receive 403 (no credentials).
      el.src    = `/api/audio/serve?url=${encodeURIComponent(track.fileUrl)}`;
      el.volume = 1;
      st.current.currentAudioId = track.audioId;

      // Set onended before play() so it fires even if playback starts during paused-resume.
      const handleEnded = () => {
        markPlayed(poiId);
        if (onPlayedRef.current && st.current.currentAudioId) {
          onPlayedRef.current(poiId, st.current.currentAudioId);
        }
        clearFinishTimer();
        const pending = st.current.pendingPoiId;
        st.current.pendingPoiId = null;
        if (pending !== null) {
          loadAndPlayRef.current(pending, true);
        } else if (resolvedPoiIdRef.current === poiId || st.current.playState === "playing") {
          // Keep bar visible for replay:
          // - User is still inside this POI geofence, OR
          // - Audio ended naturally during active playback (playState = "playing"),
          //   e.g. user manually triggered via playForPoi() while outside the geofence.
          // When the geofence exit trail fires, playState is already "finishing" (not
          // "playing"), so that case correctly falls through to "idle".
          syncState("paused", poiId);
        } else {
          syncState("idle", null);
        }
      };
      onEndedHandlerRef.current = handleEnded;
      el.onended = handleEnded;

      // Handle audio-element errors (403, network failure, codec issue).
      // Do NOT clear el.src — play() needs src set to call el.play() synchronously
      // within the user-gesture window (critical for iOS Safari autoplay policy).
      const handleError = () => {
        clearFinishTimer();
        el.onended = null;
        el.onerror = null;
        if (gen === loadGenerationRef.current) syncState("paused", poiId);
      };
      onErrorHandlerRef.current = handleError;
      el.onerror = handleError;

      try {
        await el.play();
      } catch {
        // Any play() failure (NotAllowedError on mobile autoplay block,
        // AbortError on network issues, NotSupportedError on codec, etc.)
        // Keep the bar visible as "paused" so the user can tap play to resume
        // with an explicit user gesture.
        if (gen === loadGenerationRef.current) syncState("paused", poiId);
        return;
      }

      if (gen === loadGenerationRef.current) syncState("playing", poiId);
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

    // ── New entry: outside → inside POI (or app opened while already inside) ──
    if (prev === null && next !== null && !isActive) {
      clearFinishTimer(); // Cancel any pending paused-exit trail timer
      st.current.overlapWasActive = overlapActive;
      loadAndPlay(next, true);
      return;
    }

    // ── GPS came back to a POI while draining (jitter recovery) ─────────────
    // GPS briefly flickered to null (triggering "finishing" timer) then
    // stabilised back inside the same POI. Cancel the timer and restart.
    if (prev === null && next !== null && ps === "finishing") {
      clearFinishTimer();
      st.current.overlapWasActive = overlapActive;
      loadAndPlay(next, true);
      return;
    }

    // ── Exit while paused (post-completion or user-paused before leaving) ───
    // Add a short trail so GPS jitter doesn't instantly hide the bar.
    // If GPS recovers within the trail, the "new entry" branch cancels this timer.
    if (prev !== null && next === null && ps === "paused") {
      clearFinishTimer();
      st.current.finishTimer = setTimeout(() => {
        const el = audioRef.current;
        if (el) { el.pause(); el.src = ""; el.onended = null; el.onerror = null; el.volume = 1; }
        syncState("idle", null);
      }, NORMAL_EXIT_TRAIL_MS);
      return;
    }

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
          if (el) { el.onended = null; el.onerror = null; el.pause(); el.src = ""; el.volume = 1; }
          const pending = st.current.pendingPoiId;
          st.current.pendingPoiId = null;
          syncState("idle", null);
          if (pending !== null) loadAndPlayRef.current(pending, true);
        }, OVERLAP_TRANSITION_MAX_MS);
        // Natural audio end is handled by el.onended (triggers pendingPoiId)
      } else {
        // Non-overlap zone change: 3 s trail then switch
        syncState("finishing");
        clearFinishTimer();
        st.current.finishTimer = setTimeout(() => {
          const el = audioRef.current;
          if (el) { el.onended = null; el.onerror = null; el.pause(); el.src = ""; el.volume = 1; }
          const pending = st.current.pendingPoiId;
          st.current.pendingPoiId = null;
          syncState("idle", null);
          if (pending !== null) loadAndPlayRef.current(pending, true);
        }, NORMAL_EXIT_TRAIL_MS);
      }
      return;
    }

    if (!overlapActive) st.current.overlapWasActive = false;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedPoiId, overlapActive]);

  // Reload audio when tourist switches language during active playback.
  useEffect(() => {
    const poiId = st.current.currentPoiId;
    const ps = st.current.playState;
    if (!poiId || ps === "idle") return;
    clearFinishTimer();
    const el = audioRef.current;
    if (el) { el.onended = null; el.onerror = null; el.pause(); el.src = ""; el.volume = 1; }
    onEndedHandlerRef.current = null;
    onErrorHandlerRef.current = null;
    st.current.pendingPoiId = null;
    loadAndPlayRef.current(poiId, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLanguage]);

  // Cleanup
  useEffect(() => {
    return () => {
      clearFinishTimer();
      const el = audioRef.current;
      if (el) { el.pause(); el.src = ""; el.onended = null; el.onerror = null; el.volume = 1; }
    };
  }, [audioRef, clearFinishTimer]);

  const play = useCallback(() => {
    const ps = st.current.playState;
    if (ps === "paused") {
      const el = audioRef.current;
      if (el) {
        // Use getAttribute("src") not el.src: the IDL attribute resolves to an
        // absolute URL that equals window.location.href when the attribute is "".
        const hasSrc = !!el.getAttribute("src");
        if (hasSrc) {
          // ── Play synchronously inside the user-gesture context ───────────────
          // CRITICAL for iOS Safari: the browser blocks audio loading without a
          // user gesture, so el.readyState stays at 0 after an autoplay-policy
          // rejection. Calling el.play() here (with no async await in between)
          // lets iOS start loading + playing in one step.
          if (el.ended) el.currentTime = 0; // rewind for replay
          if (el.error) el.load();           // reset error state before retrying
          // Re-attach if cleared by a previous onerror.
          if (!el.onended && onEndedHandlerRef.current) el.onended = onEndedHandlerRef.current;
          if (!el.onerror && onErrorHandlerRef.current) el.onerror = onErrorHandlerRef.current;
          el.play()
            .then(() => syncState("playing"))
            .catch(() => {
              // play() rejected even with user gesture (NotAllowedError, AbortError, …).
              // Keep src intact — the next tap will retry el.play() in the same path.
              syncState("paused");
            });
          return;
        }
        // No src set yet – load audio from the server first.
        const currentPoi = st.current.currentPoiId;
        if (currentPoi) loadAndPlay(currentPoi, true);
      }
      return;
    }
    const poi = resolvedPoiIdRef.current;
    if (!poi) return;
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
    if (el) { el.onended = null; el.onerror = null; el.pause(); el.src = ""; el.volume = 1; }
    onEndedHandlerRef.current = null;
    onErrorHandlerRef.current = null;
    st.current.pendingPoiId = null;
    syncState("idle", null);
  }, [audioRef, clearFinishTimer, syncState]);

  const playForPoi = useCallback((poiId: number) => {
    if (
      st.current.currentPoiId === poiId &&
      (st.current.playState === "playing" || st.current.playState === "loading")
    ) return;
    clearFinishTimer();
    const el = audioRef.current;
    if (el) { el.onended = null; el.onerror = null; el.pause(); el.src = ""; el.volume = 1; }
    st.current.pendingPoiId = null;
    st.current.overlapWasActive = false;
    loadAndPlay(poiId, true); // force=true: bypass cooldown for manual trigger
  }, [audioRef, clearFinishTimer, loadAndPlay]);

  return { playState, currentPoiId, play, pause, stop, playForPoi };
}
