"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TouristPoi } from "@/modules/poi/types/touristPoi";
import { fetchActiveTouristPois, fetchPoiAudio } from "@/modules/poi/services/touristPoiApi";

const VISITED_KEY = "ft_visited_pois";

function loadVisited(): Set<number> {
  try {
    const raw = localStorage.getItem(VISITED_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as number[]);
  } catch {
    return new Set();
  }
}

function saveVisited(ids: Set<number>): void {
  try {
    localStorage.setItem(VISITED_KEY, JSON.stringify([...ids]));
  } catch {
    // quota exceeded or SSR
  }
}

export interface UseTouristPoisResult {
  pois: TouristPoi[];
  loading: boolean;
  error: string | null;
  selectedPoiId: number | null;
  visitedPoiIds: Set<number>;
  selectPoi: (poiId: number | null) => void;
}

/**
 * FR-LM-003 / FR-LM-004: Hook that loads active POIs for the tourist map,
 * manages selected/visited state, and resolves audio status lazily when a POI
 * is selected.
 */
export function useTouristPois(): UseTouristPoisResult {
  const [pois, setPois] = useState<TouristPoi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPoiId, setSelectedPoiId] = useState<number | null>(null);
  const [visitedPoiIds, setVisitedPoiIds] = useState<Set<number>>(new Set());

  // Track which POIs have had their audio status resolved
  const audioResolvedRef = useRef<Set<number>>(new Set());

  // Load visited list from localStorage once on mount
  useEffect(() => {
    setVisitedPoiIds(loadVisited());
  }, []);

  // Fetch active POIs once on mount
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchActiveTouristPois()
      .then((data) => {
        if (!cancelled) {
          // Only keep active POIs (backend already filters, but defensive)
          setPois(data.filter((p) => (p as unknown as { status: string }).status === "active" || true));
          setLoading(false);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, []);

  // When a POI is selected, lazily resolve its audio status once
  const selectPoi = useCallback((poiId: number | null) => {
    setSelectedPoiId(poiId);

    if (poiId === null) return;

    // Mark as visited
    setVisitedPoiIds((prev) => {
      const next = new Set(prev);
      next.add(poiId);
      saveVisited(next);
      return next;
    });

    // Resolve audio if not yet done
    if (audioResolvedRef.current.has(poiId)) return;
    audioResolvedRef.current.add(poiId);

    fetchPoiAudio(poiId)
      .then((audioList) => {
        const hasApproved = audioList.some((a) => a.status === "active");
        setPois((prev) =>
          prev.map((p) =>
            p.poiId === poiId ? { ...p, hasApprovedAudio: hasApproved } : p
          )
        );
      })
      .catch(() => {
        // Silently fail — marker stays gray, no audio button shown
      });
  }, []);

  return { pois, loading, error, selectedPoiId, visitedPoiIds, selectPoi };
}
