"use client";

import { createContext, useContext, useMemo } from "react";
import type { ReactNode } from "react";
import type { GeofenceContextValue } from "@/modules/location/types/geofence";
import type { TouristPoi } from "@/modules/poi/types/touristPoi";
import { useLocationContext } from "@/modules/location/context/LocationContext";
import { usePositionBuffer } from "@/modules/location/hooks/usePositionBuffer";
import { useGeofenceDetector } from "@/modules/location/hooks/useGeofenceDetector";
import { useOverlapResolver } from "@/modules/location/hooks/useOverlapResolver";

const GeofenceCtx = createContext<GeofenceContextValue | null>(null);

export function useGeofenceContext(): GeofenceContextValue {
  const ctx = useContext(GeofenceCtx);
  if (!ctx) throw new Error("useGeofenceContext must be used inside GeofenceProvider");
  return ctx;
}

interface Props {
  pois: TouristPoi[];
  children: ReactNode;
}

/**
 * FR-LM-007: Provides geofencing state to all descendants.
 * Composes position buffering, per-POI entry/exit detection, and
 * overlap resolution into a single context value.
 *
 * Must be rendered below LocationPermissionGate (requires LocationContext).
 */
export function GeofenceProvider({ pois, children }: Props) {
  const { coordinates } = useLocationContext();

  const { buffer, consecutiveWeakCount } = usePositionBuffer(coordinates);
  const { geofenceMap, insidePois, overlappingPois, gpsLost, weakGps } =
    useGeofenceDetector(pois, coordinates, consecutiveWeakCount);

  const { resolvedPoiId: overlapResolved, isResolving } =
    useOverlapResolver(overlappingPois, pois, coordinates, buffer);

  // Single POI → resolved directly; overlap → use resolver result
  const resolvedPoiId =
    overlappingPois.length > 1
      ? overlapResolved
      : insidePois.length === 1
      ? insidePois[0]
      : null;

  const overlapActive = insidePois.length > 1;

  const resolvedPoi = useMemo(
    () =>
      resolvedPoiId !== null
        ? (pois.find((p) => p.poiId === resolvedPoiId) ?? null)
        : null,
    [resolvedPoiId, pois]
  );

  const value: GeofenceContextValue = {
    geofenceMap,
    insidePois,
    overlappingPois,
    resolvedPoiId,
    resolvedPoi,
    isResolving,
    overlapActive,
    gpsLost,
    weakGps,
  };

  return <GeofenceCtx.Provider value={value}>{children}</GeofenceCtx.Provider>;
}
