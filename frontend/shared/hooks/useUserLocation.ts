"use client";

import { useCallback, useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

/** UC-10: Status of the browser geolocation request. */
export type LocationStatus =
  | "idle"         // not yet requested
  | "loading"      // request in progress
  | "success"      // coordinates obtained
  | "denied"       // user blocked the permission prompt
  | "unavailable"  // navigator.geolocation not supported
  | "error";       // timeout or other PositionError

export interface UserCoordinates {
  latitude: number;
  longitude: number;
  /** Accuracy radius in metres (may be unavailable on some devices). */
  accuracy?: number;
}

export interface UseUserLocationResult {
  coordinates: UserCoordinates | null;
  status: LocationStatus;
  /** Triggers the GPS access request; safe to call before the component mounts. */
  requestLocation: () => void;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * UC-10: Requests the device's current GPS position via the browser
 * Geolocation API and tracks the request lifecycle.
 *
 * Shared hook — usable by any module that needs user-location awareness.
 */
export function useUserLocation(): UseUserLocationResult {
  const [coordinates, setCoordinates] = useState<UserCoordinates | null>(null);
  const [status, setStatus] = useState<LocationStatus>("idle");

  const requestLocation = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("unavailable");
      return;
    }

    setStatus("loading");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoordinates({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy ?? undefined,
        });
        setStatus("success");
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setStatus("denied");
        } else {
          setStatus("error");
        }
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 30_000 }
    );
  }, []);

  return { coordinates, status, requestLocation };
}
