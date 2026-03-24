"use client";

import { useEffect, useState } from "react";
import { useGeofenceContext } from "@/modules/location/context/GeofenceContext";
import { useAudioContext } from "@/modules/audio/context/AudioContext";

/**
 * FR-LM-007 §5 / FR-LM-008 §3 / NFR-GEO-U02:
 * Fixed banner that communicates the current geofence and audio state.
 *
 * Priority order (highest first):
 *  1. Overlap resolving spinner
 *  2. "Đang ở tại [tên]" — inside a resolved POI
 *  3. "Bạn đã rời vùng thuyết minh" — audio still finishing after exit
 *  4. GPS lost / GPS weak warnings
 */
export default function GeofenceBanner() {
  const { resolvedPoi, isResolving, insidePois, overlapActive, gpsLost, weakGps } =
    useGeofenceContext();
  const { playState, currentPoiId } = useAudioContext();

  // Auto-dismiss the "rời vùng" banner after 4 s
  const [showExitBanner, setShowExitBanner] = useState(false);
  useEffect(() => {
    if (playState === "finishing" && currentPoiId !== null && insidePois.length === 0) {
      setShowExitBanner(true);
      const t = setTimeout(() => setShowExitBanner(false), 4_000);
      return () => clearTimeout(t);
    } else {
      setShowExitBanner(false);
    }
  }, [playState, currentPoiId, insidePois.length]);

  const showOverlapResolving = overlapActive && isResolving;
  const showInsideBanner     = !isResolving && resolvedPoi !== null && insidePois.length > 0;
  const showGpsLost          = gpsLost;
  const showGpsWeak          = weakGps && !gpsLost;

  if (!showOverlapResolving && !showInsideBanner && !showExitBanner && !showGpsLost && !showGpsWeak) {
    return null;
  }

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[1500] flex flex-col items-center gap-2 pointer-events-none">

      {showOverlapResolving && (
        <div className="flex items-center gap-2 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-full shadow-lg">
          <span className="h-4 w-4 shrink-0 rounded-full border-2 border-white border-t-transparent animate-spin" />
          Đang phân tích vùng giao thoa…
        </div>
      )}

      {showInsideBanner && !showOverlapResolving && (
        <div className="flex items-center gap-2 bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-full shadow-lg">
          <span className="h-2 w-2 shrink-0 rounded-full bg-white animate-pulse" />
          Đang ở tại {resolvedPoi!.linkedShopName ?? resolvedPoi!.name}
        </div>
      )}

      {showExitBanner && (
        <div className="flex items-center gap-2 bg-gray-700 text-white text-sm px-4 py-2 rounded-full shadow-lg">
          Bạn đã rời vùng thuyết minh
        </div>
      )}

      {showGpsLost && (
        <div className="flex items-center gap-2 bg-amber-500 text-white text-xs px-3 py-1.5 rounded-full shadow">
          Mất tín hiệu GPS, đang giữ vị trí trước đó
        </div>
      )}

      {showGpsWeak && (
        <div className="flex items-center gap-2 bg-amber-400 text-amber-900 text-xs px-3 py-1.5 rounded-full shadow">
          Tín hiệu GPS yếu, vị trí có thể không chính xác
        </div>
      )}

    </div>
  );
}
