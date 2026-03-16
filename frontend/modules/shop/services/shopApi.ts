import type {
  ShopCreatePayload,
  ShopCreateResponse,
} from "@/modules/shop/types/shop";

export interface OpeningHourEntry {
  day: number;    // 0 = Monday … 6 = Sunday
  open: string;   // "HH:mm"
  close: string;  // "HH:mm"
  closed: boolean;
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
