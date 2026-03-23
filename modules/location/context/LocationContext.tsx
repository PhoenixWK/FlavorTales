"use client";

import { createContext, useContext } from "react";
import type { UseUserLocationResult } from "@/shared/hooks/useUserLocation";

/**
 * FR-LM-005: Shares a single GPS tracking session from LocationPermissionGate
 * down to TouristMap, preventing duplicate navigator.geolocation.watchPosition
 * calls.
 */
const LocationContext = createContext<UseUserLocationResult | null>(null);

export const LocationProvider = LocationContext.Provider;

export function useLocationContext(): UseUserLocationResult {
  const ctx = useContext(LocationContext);
  if (!ctx) {
    throw new Error(
      "useLocationContext must be used inside LocationPermissionGate"
    );
  }
  return ctx;
}
