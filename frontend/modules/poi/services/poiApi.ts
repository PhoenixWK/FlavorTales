// POI API calls go through Next.js proxy routes (/api/poi/*) so that the
// HttpOnly access_token cookie (scoped to the frontend domain) is read
// server-side and forwarded as an Authorization header to the backend.
const POI_PROXY_BASE = "/api/poi";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface OpeningHoursDto {
  day: number;
  open: string;
  close: string;
  closed: boolean;
}

/** Combined POI + shop creation payload (UC-14 / FR-PM-001).
 *  Audio is uploaded separately via POST /api/audio/shop/{shopId}/tts|upload
 *  after the POI + shop have been created. */
export interface CreatePoiPayload {
  // Step 1: POI location
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  // Step 2: Shop info (optional — form may submit POI-only)
  shopName?: string;
  shopDescription?: string;
  avatarFileId?: number;
  additionalImageIds?: number[];
  specialtyDescription?: string;
  openingHours?: OpeningHoursDto[];
  tags?: string[];
}

export interface UpdatePoiPayload {
  name?: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
}

export interface PoiResponse {
  poiId: number;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  status: string;
  linkedShopId: number | null;
  linkedShopName: string | null;
  linkedShopAvatarUrl: string | null;
  message?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function handleResponse<T>(res: Response): Promise<ApiResponse<T>> {
  const json = await res.json();
  if (!res.ok) {
    if (
      res.status === 401 &&
      json?.message === "Session expired" &&
      typeof window !== "undefined"
    ) {
      const from = encodeURIComponent(window.location.pathname);
      window.location.replace(`/auth/vendor/login?from=${from}&reason=session_expired`);
      return new Promise(() => {});
    }
    if (
      res.status === 403 &&
      json?.message === "Only vendors can access this resource" &&
      typeof window !== "undefined"
    ) {
      const from = encodeURIComponent(window.location.pathname);
      window.location.replace(`/auth/vendor/login?from=${from}&reason=role_required`);
      return new Promise(() => {});
    }
    const message = json?.message ?? json?.error ?? "An unexpected error occurred.";
    // When Spring's @Valid returns field-level errors they are in json.data (Map<field,msg>).
    // Build a readable string from them so the toast shows exactly what failed.
    const fieldErrors: Record<string, string> | undefined = json?.data;
    const detail =
      fieldErrors && typeof fieldErrors === "object" && !Array.isArray(fieldErrors)
        ? Object.values(fieldErrors).join(" | ")
        : undefined;
    const err = new Error(detail ? `${message}: ${detail}` : message) as Error & { status: number };
    err.status = res.status;
    throw err;
  }
  return json as ApiResponse<T>;
}

// ── API calls ─────────────────────────────────────────────────────────────────

export async function createPoi(
  payload: CreatePoiPayload
): Promise<ApiResponse<PoiResponse>> {
  const res = await fetch(`${POI_PROXY_BASE}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse<PoiResponse>(res);
}

export async function updatePoi(
  poiId: number,
  payload: UpdatePoiPayload
): Promise<ApiResponse<PoiResponse>> {
  const res = await fetch(`${POI_PROXY_BASE}/${poiId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse<PoiResponse>(res);
}

export async function getPoiById(poiId: number): Promise<ApiResponse<PoiResponse>> {
  const res = await fetch(`${POI_PROXY_BASE}/${poiId}`, { method: "GET" });
  return handleResponse<PoiResponse>(res);
}

export async function getActivePois(): Promise<ApiResponse<PoiResponse[]>> {
  const res = await fetch(`${POI_PROXY_BASE}`, { method: "GET" });
  return handleResponse<PoiResponse[]>(res);
}

export async function getMyPois(): Promise<ApiResponse<PoiResponse[]>> {
  const res = await fetch(`${POI_PROXY_BASE}/my`, { method: "GET" });
  return handleResponse<PoiResponse[]>(res);
}

export async function deletePoi(
  poiId: number,
  hardDelete = false
): Promise<ApiResponse<null>> {
  const res = await fetch(`${POI_PROXY_BASE}/${poiId}?hard=${hardDelete}`, {
    method: "DELETE",
  });
  return handleResponse<null>(res);
}
