import type {
  ShopCreatePayload,
  ShopCreateResponse,
  OpeningHoursDto,
} from "@/modules/shop/types/shop";

export interface OpeningHourEntry {
  day: number;    // 0 = Monday … 6 = Sunday
  open: string;   // "HH:mm"
  close: string;  // "HH:mm"
  closed: boolean;
}

/** Audio is managed separately via POST /api/audio/shop/{shopId}/tts|upload */
export interface ShopUpdatePayload {
  name: string;
  description: string;
  avatarFileId?: number;
  additionalImageIds?: number[];
  specialtyDescription?: string;
  openingHours?: OpeningHoursDto[];
  tags?: string[];
}

export interface ShopResponse {
  shopId: number;
  name: string;
  description: string | null;
  cuisineStyle: string | null;
  featuredDish: string | null;
  status: "pending" | "active" | "rejected" | "disabled";
  poiId: number | null;
  poiName: string | null;
  avatarUrl: string | null;
  openingHours: OpeningHourEntry[] | null; // parsed from JSON string by API route
  tags: string[] | null;
  createdAt: string | null;
  updatedAt: string | null;
}

/** Full shop detail including gallery (vendor-facing).
 *  Audio is fetched separately via GET /api/audio/shop/{shopId}. */
export interface ShopDetail extends ShopResponse {
  galleryUrls: string[] | null;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export async function getMyShops(): Promise<ApiResponse<ShopResponse[]>> {
  const res = await fetch("/api/shop/my", { method: "GET" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return { success: false, message: err.message ?? "Failed to fetch shops", data: [] };
  }
  return res.json();
}

export async function getMyShopDetail(shopId: number): Promise<ApiResponse<ShopDetail>> {
  const res = await fetch(`/api/shop/${shopId}`, { method: "GET" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return {
      success: false,
      message: err.message ?? "Failed to fetch shop detail",
      data: null as unknown as ShopDetail,
    };
  }
  return res.json();
}

export async function createShop(
  payload: ShopCreatePayload
): Promise<ApiResponse<ShopCreateResponse>> {
  const res = await fetch("/api/shop", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (res.status === 401) {
    window.location.href = "/auth/vendor/login";
  }

  return res.json();
}

export async function updateShop(
  shopId: number,
  payload: ShopUpdatePayload
): Promise<ApiResponse<null>> {
  const res = await fetch(`/api/shop/${shopId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (res.status === 401) {
    window.location.href = "/auth/vendor/login";
  }

  const json = await res.json();
  if (!res.ok) {
    const fieldErrors: Record<string, string> | undefined = json?.data;
    const detail =
      fieldErrors && typeof fieldErrors === "object" && !Array.isArray(fieldErrors)
        ? Object.values(fieldErrors).join(" | ")
        : undefined;
    const msg = json?.message ?? "Cập nhật gian hàng thất bại.";
    throw new Error(detail ? `${msg}: ${detail}` : msg);
  }
  return json;
}

