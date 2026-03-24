"use client";

import { useEffect, useRef, useState } from "react";
import type { UserCoordinates } from "@/shared/hooks/useUserLocation";

/** NFR-GEO-A01: Reject GPS updates with accuracy worse than this threshold. */
const MAX_ACCURACY_M = 15;
/** NFR-GEO-A03: Keep the last N valid positions for heading calculation. */
const BUFFER_SIZE = 5;

export interface PositionBufferResult {
  buffer: UserCoordinates[];
  /** Count of consecutive updates that exceeded the accuracy threshold. */
  consecutiveWeakCount: number;
}

/**
 * Maintains a sliding window of the last BUFFER_SIZE valid GPS positions.
 * Silently drops updates where accuracy > 15 m (NFR-GEO-A01).
 */
export function usePositionBuffer(
  coordinates: UserCoordinates | null
): PositionBufferResult {
  const [buffer, setBuffer] = useState<UserCoordinates[]>([]);
  const weakCountRef = useRef(0);
  const [consecutiveWeakCount, setConsecutiveWeakCount] = useState(0);

  useEffect(() => {
    if (!coordinates) return;

    const accuracy = coordinates.accuracy ?? 0;
    if (accuracy > MAX_ACCURACY_M) {
      weakCountRef.current += 1;
      setConsecutiveWeakCount(weakCountRef.current);
      return;
    }

    weakCountRef.current = 0;
    setConsecutiveWeakCount(0);
    setBuffer((prev) => {
      const next = [...prev, coordinates];
      return next.length > BUFFER_SIZE ? next.slice(next.length - BUFFER_SIZE) : next;
    });
  }, [coordinates]);

  return { buffer, consecutiveWeakCount };
}
