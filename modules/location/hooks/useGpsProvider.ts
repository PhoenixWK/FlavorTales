"use client";

import { useUserLocation } from "@/shared/hooks/useUserLocation";
import { useMockGpsProvider } from "@/modules/location/hooks/useMockGpsProvider";
import type { UseUserLocationResult } from "@/shared/hooks/useUserLocation";

/**
 * NFR-GEO-T01: Wraps both real and mock GPS providers.
 * Returns mock results when NEXT_PUBLIC_MOCK_GPS=true; otherwise real GPS.
 *
 * Both hooks are always called (React rules of hooks). In production the mock
 * hook is passive — it never starts playback unless window.__MOCK_GPS_CONFIG
 * is set externally.
 */
export function useGpsProvider(): UseUserLocationResult {
  const real = useUserLocation();
  const mock = useMockGpsProvider();

  return process.env.NEXT_PUBLIC_MOCK_GPS === "true" ? mock : real;
}
