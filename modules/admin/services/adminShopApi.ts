// Types shared between list and detail views

export interface OpeningHourSlot {
  day: string;
  open: string;
  close: string;
  closed: boolean;
}

export interface AdminShopListItem {
  shopId: number;
  name: string;
  cuisineStyle: string | null;
  avatarUrl: string | null;
  poiId: number | null;
  poiName: string | null;
  openingHours: OpeningHourSlot[] | null;
  tags: string[] | null;
  status: string;
  vendorEmail: string;
  createdAt: string;
}

export interface AdminShopDetail extends AdminShopListItem {
  description: string | null;
  featuredDish: string | null;
  galleryUrls: string[];
  viAudioUrl: string | null;
  enAudioUrl: string | null;
}

// ── API helpers ───────────────────────────────────────────────────────────────

async function handleResponse<T>(res: Response): Promise<T> {
  const json = await res.json();
  if (!res.ok || !json.success) {
    if (res.status === 401) {
      window.location.href = "/auth/admin/login?reason=session_expired";
    }
    throw Object.assign(new Error(json.message ?? "Request failed"), {
      status: res.status,
    });
  }
  return json.data as T;
}

export async function fetchPendingShops(): Promise<AdminShopListItem[]> {
  const res = await fetch("/api/admin/shops/pending", { cache: "no-store" });
  return handleResponse<AdminShopListItem[]>(res);
}

export async function fetchShopDetail(shopId: number): Promise<AdminShopDetail> {
  const res = await fetch(`/api/admin/shops/${shopId}`, { cache: "no-store" });
  return handleResponse<AdminShopDetail>(res);
}

export async function approveShop(shopId: number): Promise<void> {
  const res = await fetch(`/api/admin/shops/${shopId}/approve`, {
    method: "PATCH",
  });
  await handleResponse<void>(res);
}

export async function rejectShop(shopId: number): Promise<void> {
  const res = await fetch(`/api/admin/shops/${shopId}/reject`, {
    method: "PATCH",
  });
  await handleResponse<void>(res);
}
