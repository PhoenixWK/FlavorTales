"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  UseUserLocationResult,
  UserCoordinates,
  LocationStatus,
} from "@/shared/hooks/useUserLocation";

/** Available mock scenarios (NFR-GEO-T01). */
export type MockGpsScenario =
  | "straight_walk"       // Interpolated walk from startCoord to endCoord
  | "stationary_overlap"  // Fixed position inside 2 POI radii; speed = 0
  | "fast_moving"         // speed = 3.5 m/s (triggers fast-exit bypass)
  | "gps_lost"            // Emits no updates for > 10 s
  | "weak_gps";           // accuracy = 20 m (exceeds 15 m threshold)

export interface MockGpsConfig {
  scenario: MockGpsScenario;
  startCoord?: [number, number];
  endCoord?: [number, number];
  steps?: number;
  intervalMs?: number;
}

declare global {
  interface Window {
    __MOCK_GPS_CONFIG?: MockGpsConfig;
    __mockGpsUpdate?: (config: MockGpsConfig) => void;
  }
}

const DEFAULT_COORD: [number, number] = [16.0, 107.5];

function generateWaypoints(config: MockGpsConfig): UserCoordinates[] {
  const start = config.startCoord ?? DEFAULT_COORD;
  const end   = config.endCoord   ?? [start[0] + 0.001, start[1] + 0.001];
  const steps = config.steps ?? 20;
  const speed = config.scenario === "fast_moving" ? 3.5 : 0.8;

  switch (config.scenario) {
    case "straight_walk":
    case "fast_moving":
      return Array.from({ length: steps }, (_, i) => ({
        latitude:  start[0] + (end[0] - start[0]) * (i / Math.max(steps - 1, 1)),
        longitude: start[1] + (end[1] - start[1]) * (i / Math.max(steps - 1, 1)),
        accuracy: 5,
        speed,
        heading: 45,
      }));

    case "stationary_overlap":
      return Array.from({ length: steps }, () => ({
        latitude: start[0], longitude: start[1],
        accuracy: 5, speed: 0, heading: null,
      }));

    case "gps_lost":
      return []; // No points emitted → GPS-lost timer fires after 10 s

    case "weak_gps":
      return Array.from({ length: steps }, () => ({
        latitude: start[0], longitude: start[1],
        accuracy: 20, speed: 0.1, heading: null,
      }));
  }
}

/**
 * NFR-GEO-T01: Drop-in replacement for useUserLocation that emits scripted
 * GPS coordinates. Controlled at runtime via window.__mockGpsUpdate().
 */
export function useMockGpsProvider(): UseUserLocationResult {
  const [coordinates, setCoordinates] = useState<UserCoordinates | null>(null);
  const [status, setStatus] = useState<LocationStatus>("idle");

  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const indexRef     = useRef(0);
  const waypointsRef = useRef<UserCoordinates[]>([]);

  const stopPlayback = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startPlayback = useCallback(
    (config: MockGpsConfig) => {
      stopPlayback();
      indexRef.current = 0;
      waypointsRef.current = generateWaypoints(config);

      if (waypointsRef.current.length === 0) {
        setStatus("searching"); // gps_lost: no updates
        return;
      }

      setStatus("success");
      const interval = config.intervalMs ?? 1_000;

      timerRef.current = setInterval(() => {
        const pts = waypointsRef.current;
        const idx = indexRef.current;
        if (idx >= pts.length) {
          // Loop on last position
          setCoordinates(pts[pts.length - 1]);
          return;
        }
        setCoordinates(pts[idx]);
        indexRef.current = idx + 1;
      }, interval);
    },
    [stopPlayback]
  );

  useEffect(() => {
    // Expose control surface for the dev panel and automated tests
    window.__mockGpsUpdate = (config: MockGpsConfig) => startPlayback(config);
    const initial = window.__MOCK_GPS_CONFIG;
    if (initial) startPlayback(initial);

    return () => {
      stopPlayback();
      delete window.__mockGpsUpdate;
    };
  }, [startPlayback, stopPlayback]);

  const requestLocation = useCallback(() => {
    const config: MockGpsConfig = window.__MOCK_GPS_CONFIG ?? {
      scenario: "straight_walk",
      startCoord: DEFAULT_COORD,
    };
    startPlayback(config);
  }, [startPlayback]);

  return { coordinates, status, requestLocation };
}
