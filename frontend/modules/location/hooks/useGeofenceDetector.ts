"use client";

import { useEffect, useRef, useState } from "react";
import type { UserCoordinates } from "@/shared/hooks/useUserLocation";
import type { TouristPoi } from "@/modules/poi/types/touristPoi";
import type { GeofenceMap, PoiGeofenceState } from "@/modules/location/types/geofence";
import { haversineMetres } from "@/modules/location/utils/geoMath";

/** NFR-GEO-P03: Minimum ms between full geofence scans. */
const THROTTLE_MS = 2_000;
/** NFR-GEO-R01: Grace period after exiting a POI at walking speed. */
const GRACE_PERIOD_MS = 10_000;
/** NFR-GEO-R03: Declare GPS lost after this duration without a valid update. */
const GPS_LOST_TIMEOUT_MS = 10_000;
/** NFR-GEO-A02: Speed above which exit is considered "fast". */
const FAST_SPEED_MPS = 2.0;
/** NFR-GEO-A02: Sustained fast-speed window to confirm fast exit. */
const FAST_SPEED_WINDOW_MS = 3_000;

export interface GeofenceDetectorResult {
  geofenceMap: GeofenceMap;
  insidePois: number[];
  overlappingPois: number[];
  gpsLost: boolean;
  weakGps: boolean;
}

/**
 * FR-LM-007 §2–4: Continuously checks which POIs the user is currently inside.
 * Manages grace periods (NFR-GEO-R01), fast-exit detection (NFR-GEO-A02),
 * and GPS-lost state (NFR-GEO-R03).
 */
export function useGeofenceDetector(
  pois: TouristPoi[],
  coordinates: UserCoordinates | null,
  consecutiveWeakCount: number
): GeofenceDetectorResult {
  const geofenceMapRef = useRef<GeofenceMap>({});
  const [geofenceMap, setGeofenceMap] = useState<GeofenceMap>({});
  const [gpsLost, setGpsLost] = useState(false);

  const graceTimersRef = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const lastCheckRef = useRef<number>(0);
  const gpsLostTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bypassThrottleRef = useRef(false);
  const fastSpeedTimestampsRef = useRef<number[]>([]);
  const gpsLostRef = useRef(false);

  const weakGps = consecutiveWeakCount >= 3;

  /** Finalises an exit after the grace timer fires. Captured in a stable ref. */
  const finalizeExitRef = useRef<(poiId: number) => void>(() => {});
  finalizeExitRef.current = (poiId: number) => {
    delete graceTimersRef.current[poiId];
    const current = geofenceMapRef.current;
    if (current[poiId] === "grace_period") {
      const updated: GeofenceMap = { ...current, [poiId]: "outside" };
      geofenceMapRef.current = updated;
      setGeofenceMap(updated);
    }
  };

  useEffect(() => {
    // Reset GPS-lost timer on every coordinate change (including null)
    if (gpsLostTimerRef.current) clearTimeout(gpsLostTimerRef.current);

    if (!coordinates) {
      gpsLostTimerRef.current = setTimeout(() => {
        gpsLostRef.current = true;
        setGpsLost(true);
      }, GPS_LOST_TIMEOUT_MS);
      return;
    }

    // GPS restored — re-evaluate immediately
    if (gpsLostRef.current) {
      gpsLostRef.current = false;
      setGpsLost(false);
      bypassThrottleRef.current = true;
    }

    gpsLostTimerRef.current = setTimeout(() => {
      gpsLostRef.current = true;
      setGpsLost(true);
    }, GPS_LOST_TIMEOUT_MS);

    // Throttle (bypass after GPS restore or explicitly overridden)
    const now = Date.now();
    if (!bypassThrottleRef.current && now - lastCheckRef.current < THROTTLE_MS) return;
    lastCheckRef.current = now;
    bypassThrottleRef.current = false;

    // Fast-movement detection (NFR-GEO-A02)
    const speed = coordinates.speed ?? 0;
    if (speed > FAST_SPEED_MPS) {
      fastSpeedTimestampsRef.current.push(now);
    } else {
      fastSpeedTimestampsRef.current = [];
    }
    fastSpeedTimestampsRef.current = fastSpeedTimestampsRef.current.filter(
      (t) => now - t <= FAST_SPEED_WINDOW_MS
    );
    const isFastMoving =
      fastSpeedTimestampsRef.current.length >= 2 &&
      now - fastSpeedTimestampsRef.current[0] >= FAST_SPEED_WINDOW_MS * 0.9;

    const prevMap = geofenceMapRef.current;
    const updates: GeofenceMap = { ...prevMap };
    let changed = false;

    for (const poi of pois) {
      const dist = haversineMetres(
        coordinates.latitude,
        coordinates.longitude,
        poi.latitude,
        poi.longitude
      );
      const isInside = dist <= poi.radius;
      const prevState: PoiGeofenceState = prevMap[poi.poiId] ?? "outside";
      let newState: PoiGeofenceState = prevState;

      if (isInside) {
        // Cancel any active grace timer for this POI
        if (graceTimersRef.current[poi.poiId]) {
          clearTimeout(graceTimersRef.current[poi.poiId]);
          delete graceTimersRef.current[poi.poiId];
        }
        newState = "inside";
      } else {
        if (prevState === "inside") {
          if (isFastMoving) {
            // Fast exit: skip grace period
            newState = "outside";
          } else {
            // Normal exit: enter grace period
            newState = "grace_period";
            const id = poi.poiId;
            graceTimersRef.current[id] = setTimeout(
              () => finalizeExitRef.current(id),
              GRACE_PERIOD_MS
            );
          }
        } else if (prevState === "grace_period" && isFastMoving) {
          // Speed increased while in grace → immediate exit
          if (graceTimersRef.current[poi.poiId]) {
            clearTimeout(graceTimersRef.current[poi.poiId]);
            delete graceTimersRef.current[poi.poiId];
          }
          newState = "outside";
        } else {
          newState = "outside";
        }
      }

      if (newState !== prevState) {
        updates[poi.poiId] = newState;
        changed = true;
      }
    }

    if (changed) {
      geofenceMapRef.current = updates;
      setGeofenceMap(updates);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coordinates, pois]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      Object.values(graceTimersRef.current).forEach(clearTimeout);
      if (gpsLostTimerRef.current) clearTimeout(gpsLostTimerRef.current);
    };
  }, []);

  const insidePois = Object.entries(geofenceMap)
    .filter(([, s]) => s === "inside" || s === "grace_period")
    .map(([id]) => Number(id));

  const overlappingPois = insidePois.length > 1 ? insidePois : [];

  return { geofenceMap, insidePois, overlappingPois, gpsLost, weakGps };
}
