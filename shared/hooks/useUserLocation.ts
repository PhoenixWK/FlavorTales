"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

/** UC-10 / FR-LM-005: Status of the browser geolocation request. */
export type LocationStatus =
  | "idle"        // not yet requested
  | "loading"     // first request in progress
  | "success"     // coordinates obtained
  | "denied"      // user blocked the permission prompt
  | "unavailable" // navigator.geolocation not supported (no GPS hardware)
  | "searching"   // GPS signal weak or temporarily unavailable
  | "error";      // unexpected PositionError

export interface UserCoordinates {
  latitude: number;
  longitude: number;
  /** Accuracy radius in metres. */
  accuracy?: number;
  /** Degrees clockwise from north; null when stationary. */
  heading?: number | null;
  /** Speed in m/s; null when stationary. */
  speed?: number | null;
}

export interface UseUserLocationResult {
  coordinates: UserCoordinates | null;
  status: LocationStatus;
  requestLocation: () => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────

/** Minimum interval (ms) between React state updates — ~3 s per FR-LM-005. */
const MIN_UPDATE_INTERVAL_MS = 3_000;

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * FR-LM-005: Continuously tracks the device GPS position via watchPosition.
 * - Updates state at most every 3 s while the app is visible.
 * - Pauses tracking when the page is hidden (battery saving).
 * - Reduces GPS accuracy when battery level < 20 % (battery saving).
 * - Exposes heading/speed for direction-arrow rendering.
 *
 * Shared hook — usable by any module that needs user-location awareness.
 */
export function useUserLocation(): UseUserLocationResult {
  const [coordinates, setCoordinates] = useState<UserCoordinates | null>(null);
  const [status, setStatus] = useState<LocationStatus>("idle");

  const watchIdRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);
  // Keep a ref in sync so the visibility handler can read status without
  // being recreated on every status change.
  const statusRef = useRef<LocationStatus>("idle");

  const updateStatus = useCallback((s: LocationStatus) => {
    statusRef.current = s;
    setStatus(s);
  }, []);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  const startTracking = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      updateStatus("unavailable");
      return;
    }

    updateStatus("loading");

    // Battery saving: fall back to low-accuracy mode below 20 %
    let enableHighAccuracy = true;
    try {
      if ("getBattery" in navigator) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const battery = await (navigator as any).getBattery();
        if (!battery.charging && battery.level < 0.2) {
          enableHighAccuracy = false;
        }
      }
    } catch {
      // Battery API unsupported — keep high accuracy
    }

    stopTracking(); // clear any existing watch before starting a new one

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        // Throttle React state updates to MIN_UPDATE_INTERVAL_MS
        const now = Date.now();
        if (now - lastUpdateRef.current < MIN_UPDATE_INTERVAL_MS) return;
        lastUpdateRef.current = now;

        setCoordinates({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy ?? undefined,
          heading: position.coords.heading,
          speed: position.coords.speed,
        });
        updateStatus("success");
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          updateStatus("denied");
          stopTracking(); // permission won't change; no point keeping the watch
        } else if (
          error.code === error.POSITION_UNAVAILABLE ||
          error.code === error.TIMEOUT
        ) {
          // Keep the watch alive; signal may improve
          updateStatus("searching");
        } else {
          updateStatus("error");
        }
      },
      { enableHighAccuracy, timeout: 10_000, maximumAge: 5_000 }
    );
  }, [stopTracking, updateStatus]);

  // Stop tracking when page goes to background; resume when it becomes active
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        stopTracking();
      } else {
        const s = statusRef.current;
        if (s !== "idle" && s !== "denied" && s !== "unavailable") {
          startTracking();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [startTracking, stopTracking]);

  // Clean up watch on unmount
  useEffect(() => () => stopTracking(), [stopTracking]);

  return { coordinates, status, requestLocation: startTracking };
}
