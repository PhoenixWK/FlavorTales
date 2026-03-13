// POI API calls go through Next.js proxy routes (/api/poi/*) so that the
// HttpOnly access_token cookie (scoped to the frontend domain) is read
// server-side and forwarded as an Authorization header to the backend.
// Direct browser fetch to the backend would not include the cookie because
// it is scoped to the frontend domain, not the backend domain.
const POI_PROXY_BASE = "/api/poi";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CreatePoiPayload {
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
}

export interface UpdatePoiPayload {
  name?: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
  /** null = no change | 0 = unlink | positive = link to this shop */
  shopId?: number | null;
}

export interface ShopOption {
  shopId: number;
  name: string;
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
    const message = json?.message ?? json?.error ?? "An unexpected error occurred.";
    const err = new Error(message) as Error & { status: number };
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
  const res = await fetch(`${POI_PROXY_BASE}/${poiId}`, {
    method: "GET",
  });
  return handleResponse<PoiResponse>(res);
}

export async function getActivePois(): Promise<ApiResponse<PoiResponse[]>> {
  const res = await fetch(`${POI_PROXY_BASE}`, {
    method: "GET",
  });
  return handleResponse<PoiResponse[]>(res);
}

/**
 * Fetches POIs belonging to the currently authenticated vendor.
 */
export async function getMyPois(): Promise<ApiResponse<PoiResponse[]>> {
  const res = await fetch(`${POI_PROXY_BASE}/my`, {
    method: "GET",
  });
  return handleResponse<PoiResponse[]>(res);
}

/**
 * Fetches the vendor's active shops that have no POI yet (for the shop dropdown).
 */
export async function getAvailableShops(): Promise<ApiResponse<ShopOption[]>> {
  const res = await fetch(`${POI_PROXY_BASE}/shops/available`, {
    method: "GET",
  });
  return handleResponse<ShopOption[]>(res);
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
