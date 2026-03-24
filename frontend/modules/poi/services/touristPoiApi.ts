import type { TouristPoi, TouristPoiAudio } from "@/modules/poi/types/touristPoi";

// Use the Next.js proxy routes so browser calls go through the same-origin
// server rather than directly to the backend (avoids CORS in dev, follows
// existing project patterns).
const POI_PROXY  = "/api/poi";
const AUDIO_PROXY = "/api/audio";

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

async function handleJson<T>(res: Response): Promise<T> {
  const json: ApiResponse<T> = await res.json();
  if (!res.ok) throw new Error(json.message ?? "Request failed");
  return json.data;
}

/** GET /api/poi — returns all active POIs (public, no auth). */
export async function fetchActiveTouristPois(): Promise<TouristPoi[]> {
  const res = await fetch(POI_PROXY);
  return handleJson<TouristPoi[]>(res);
}

/**
 * GET /api/audio/poi/{poiId} — returns audio list for a POI.
 * Filters to status = "active" to determine if approved audio exists.
 */
export async function fetchPoiAudio(poiId: number): Promise<TouristPoiAudio[]> {
  const res = await fetch(`${AUDIO_PROXY}/poi/${poiId}`);
  return handleJson<TouristPoiAudio[]>(res);
}
