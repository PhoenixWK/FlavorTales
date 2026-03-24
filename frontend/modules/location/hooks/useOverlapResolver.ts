"use client";

import { useEffect, useRef, useState } from "react";
import type { UserCoordinates } from "@/shared/hooks/useUserLocation";
import type { TouristPoi } from "@/modules/poi/types/touristPoi";
import {
  haversineMetres,
  bearingDeg,
  headingMatch,
  computeMovementBearing,
} from "@/modules/location/utils/geoMath";
import { getOpenStatus } from "@/modules/poi/utils/openStatusUtils";

/** NFR-GEO-P02: Observation window before scoring (maximum 5 s). */
const COOLDOWN_MS = 5_000;
/** Speed below which user is considered stationary. */
const STATIONARY_SPEED_MPS = 0.5;
/** How many buffer entries must all be stationary to trigger stationary mode. */
const STATIONARY_WINDOW = 3;

const DEFAULT_WEIGHTS = { w1: 0.4, w2: 0.3, w3: 0.2, w4: 0.1 };

export interface OverlapResolverResult {
  resolvedPoiId: number | null;
  isResolving: boolean;
}

/**
 * FR-LM-007 §6: When 2+ POIs are simultaneously inside, waits COOLDOWN_MS then
 * scores each candidate and selects the winner.
 *
 * Score = w1*(1/dist) + w2*headingMatch + w3*normLikes + w4*contextBonus
 *
 * Weight adjustments:
 *  - Stationary user: w1=0.55, w2=0, w3=0.25 (no heading signal)
 *  - Buffer < 5 pts:  w1=0.55, w3=0.25      (unreliable heading)
 *
 * Tie-break: lowest poiId (deterministic).
 * Debug logging enabled by NEXT_PUBLIC_DEBUG_GEOFENCE=true (NFR-GEO-T02).
 */
export function useOverlapResolver(
  overlappingPois: number[],
  pois: TouristPoi[],
  coordinates: UserCoordinates | null,
  buffer: UserCoordinates[]
): OverlapResolverResult {
  const [resolvedPoiId, setResolvedPoiId] = useState<number | null>(null);
  const [isResolving, setIsResolving] = useState(false);

  const cooldownRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevOverlapKeyRef = useRef("");

  // Keep refs fresh so the timeout closure reads current values
  const coordinatesRef = useRef(coordinates);
  const bufferRef = useRef(buffer);
  const poisRef = useRef(pois);
  coordinatesRef.current = coordinates;
  bufferRef.current = buffer;
  poisRef.current = pois;

  const overlapKey = [...overlappingPois].sort().join(",");

  useEffect(() => {
    if (overlappingPois.length < 2) {
      if (cooldownRef.current) {
        clearTimeout(cooldownRef.current);
        cooldownRef.current = null;
      }
      setIsResolving(false);
      setResolvedPoiId(null);
      prevOverlapKeyRef.current = "";
      return;
    }

    // Same overlap group → don't restart the cooldown
    if (overlapKey === prevOverlapKeyRef.current) return;
    prevOverlapKeyRef.current = overlapKey;

    if (cooldownRef.current) clearTimeout(cooldownRef.current);
    setIsResolving(true);
    setResolvedPoiId(null);

    cooldownRef.current = setTimeout(() => {
      const winner = scoreAndResolve(
        overlappingPois,
        poisRef.current,
        coordinatesRef.current,
        bufferRef.current
      );
      setResolvedPoiId(winner);
      setIsResolving(false);
      cooldownRef.current = null;
    }, COOLDOWN_MS);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overlapKey]);

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearTimeout(cooldownRef.current);
    };
  }, []);

  return { resolvedPoiId, isResolving };
}

// ── Internal scoring logic ────────────────────────────────────────────────────

function scoreAndResolve(
  overlappingPoiIds: number[],
  allPois: TouristPoi[],
  coordinates: UserCoordinates | null,
  buffer: UserCoordinates[]
): number | null {
  const startMs = Date.now();
  if (!coordinates) return null;

  const candidates = overlappingPoiIds
    .map((id) => allPois.find((p) => p.poiId === id))
    .filter((p): p is TouristPoi => p != null && p.hasApprovedAudio !== false);

  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0].poiId;

  const movementBearing = computeMovementBearing(buffer);
  const bufferFull = buffer.length >= 5;

  const recentSpeeds = buffer.slice(-STATIONARY_WINDOW).map((c) => c.speed ?? 0);
  const isStationary =
    recentSpeeds.length >= STATIONARY_WINDOW &&
    recentSpeeds.every((s) => s < STATIONARY_SPEED_MPS);

  let w1 = DEFAULT_WEIGHTS.w1;
  let w2 = DEFAULT_WEIGHTS.w2;
  let w3 = DEFAULT_WEIGHTS.w3;
  const w4 = DEFAULT_WEIGHTS.w4;

  if (isStationary) {
    w1 = 0.55; w2 = 0; w3 = 0.25;
  } else if (!bufferFull) {
    w1 = 0.55; w3 = 0.25;
  }

  const maxLikes = Math.max(...candidates.map((p) => p.likesCount ?? 0));

  const scored = candidates.map((poi) => {
    const dist = haversineMetres(
      coordinates.latitude,
      coordinates.longitude,
      poi.latitude,
      poi.longitude
    );
    const hm = headingMatch(
      movementBearing,
      bearingDeg(
        [coordinates.latitude, coordinates.longitude],
        [poi.latitude, poi.longitude]
      )
    );
    const normalizedLikes = maxLikes > 0 ? (poi.likesCount ?? 0) / maxLikes : 0;
    const shopOpen = getOpenStatus(poi.shopOpeningHours)?.open ?? false;
    const contextBonus = shopOpen && poi.hasApprovedAudio === true ? 1 : 0;
    const score =
      w1 * (1 / Math.max(dist, 0.1)) +
      w2 * (hm ? 1 : 0) +
      w3 * normalizedLikes +
      w4 * contextBonus;
    return { poi, score, dist, hm, normalizedLikes, contextBonus };
  });

  // Highest score first; tie-break: lowest poiId
  scored.sort((a, b) =>
    b.score !== a.score ? b.score - a.score : a.poi.poiId - b.poi.poiId
  );

  if (process.env.NEXT_PUBLIC_DEBUG_GEOFENCE === "true") {
    console.debug("[GeofenceOverlap]", {
      poiIds: overlappingPoiIds,
      weights: { w1, w2, w3, w4 },
      scores: scored.map((s) => ({ poiId: s.poi.poiId, score: +s.score.toFixed(5) })),
      winnerPoiId: scored[0].poi.poiId,
      dominantFactor: getDominantFactor(scored[0], w1, w2, w3, w4),
      elapsedMs: Date.now() - startMs,
    });
  }

  return scored[0].poi.poiId;
}

interface ScoredEntry {
  dist: number;
  hm: boolean;
  normalizedLikes: number;
  contextBonus: number;
}

function getDominantFactor(
  entry: ScoredEntry,
  w1: number, w2: number, w3: number, w4: number
): string {
  const contributions: Record<string, number> = {
    distance:   w1 * (1 / Math.max(entry.dist, 0.1)),
    heading:    w2 * (entry.hm ? 1 : 0),
    popularity: w3 * entry.normalizedLikes,
    context:    w4 * entry.contextBonus,
  };
  return Object.entries(contributions).sort((a, b) => b[1] - a[1])[0][0];
}
