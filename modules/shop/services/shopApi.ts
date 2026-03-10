export interface ShopResponse {
  shopId: number;
  name: string;
  description: string | null;
  cuisineStyle: string | null;
  featuredDish: string | null;
  status: "pending" | "active" | "rejected" | "disabled";
  poiId: number | null;
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
