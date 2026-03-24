import type { TouristPoi } from "@/modules/poi/types/touristPoi";

/** State of a single POI geofence from the current user's perspective. */
export type PoiGeofenceState = "outside" | "inside" | "grace_period";

/** Record of geofence state keyed by poiId. */
export type GeofenceMap = Record<number, PoiGeofenceState>;

export interface GeofenceContextValue {
  /** Per-POI geofence state. */
  geofenceMap: GeofenceMap;
  /** POIs where state is "inside" or "grace_period" (both treated as inside per NFR-GEO-R01). */
  insidePois: number[];
  /** When 2+ POIs are simultaneously inside — candidates for overlap resolution. */
  overlappingPois: number[];
  /**
   * The single authoritative POI to play audio for:
   * - Single POI inside (no overlap): that POI's ID
   * - After overlap resolution: the winning POI's ID
   * - During resolution cooldown or outside all POIs: null
   */
  resolvedPoiId: number | null;
  /** Full TouristPoi object for the resolved POI (null if none). */
  resolvedPoi: TouristPoi | null;
  /** True during overlap cooldown (≤ 5 s). */
  isResolving: boolean;
  /** True when insidePois.length > 1 (even after resolution). */
  overlapActive: boolean;
  /** GPS signal lost for > 10 s (NFR-GEO-R03). */
  gpsLost: boolean;
  /** 3 consecutive GPS updates exceeded accuracy threshold (> 15 m) (NFR-GEO-A01). */
  weakGps: boolean;
}

export type AudioPlayState =
  | "idle"       // Nothing loaded/playing
  | "loading"    // Fetching audio track from API
  | "playing"    // Active playback
  | "finishing"  // Draining current audio before transition or exit trail
  | "paused";    // User-paused

export interface AudioContextValue {
  playState: AudioPlayState;
  /** POI currently loaded/playing. */
  currentPoiId: number | null;
  /** Language code of the active session (e.g. "VI", "EN"). */
  currentLanguage: string;
  play: () => void;
  pause: () => void;
  stop: () => void;
}
