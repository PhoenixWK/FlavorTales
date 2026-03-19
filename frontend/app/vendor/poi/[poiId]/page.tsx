import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { PoiResponse } from "@/modules/poi/services/poiApi";
import type { ShopDetail } from "@/modules/shop/services/shopApi";
import PoiDetailView from "@/modules/poi/components/view/PoiDetailView";

export const metadata: Metadata = {
  title: "View POI – FlavorTales",
};

const API_BASE =
  process.env.INTERNAL_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8080";

async function fetchPoi(poiId: string, token: string): Promise<PoiResponse | null> {
  try {
    const res = await fetch(`${API_BASE}/api/poi/${poiId}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data as PoiResponse;
  } catch {
    return null;
  }
}

async function fetchShopDetail(shopId: number, token: string): Promise<ShopDetail | null> {
  try {
    const res = await fetch(`${API_BASE}/api/shop/my/${shopId}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.success || !json.data) return null;
    const d = json.data;
    return {
      ...d,
      openingHours:
        typeof d.openingHours === "string" ? JSON.parse(d.openingHours) : d.openingHours ?? null,
      tags: typeof d.tags === "string" ? JSON.parse(d.tags) : d.tags ?? null,
    } as ShopDetail;
  } catch {
    return null;
  }
}

export default async function ViewPoiPage({
  params,
}: {
  params: Promise<{ poiId: string }>;
}) {
  const { poiId } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  if (!token) notFound();

  const poi = await fetchPoi(poiId, token);
  if (!poi) notFound();

  const shop = poi.linkedShopId ? await fetchShopDetail(poi.linkedShopId, token) : null;
  if (!shop) notFound();

  const isPending = poi.status.toLowerCase() === "pending";

  return (
    <main className="p-4 sm:p-6 md:p-8">
      {/* Back link */}
      <Link
        href="/vendor/poi"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-orange-500 transition mb-6"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-4 h-4"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to POI Management
      </Link>

      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{poi.name}</h2>
          <p className="text-sm text-gray-500 mt-1">
            Viewing your POI submission.
          </p>
        </div>

        {/* Edit button — hidden while pending */}
        {!isPending && (
          <Link
            href={`/vendor/poi/${poi.poiId}/edit`}
            className="inline-flex items-center gap-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-4 h-4"
            >
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Edit POI
          </Link>
        )}
      </div>

      <div className="max-w-5xl mx-auto">
        <PoiDetailView poi={poi} shop={shop} />
      </div>
    </main>
  );
}
