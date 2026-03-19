import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const API_BASE =
  process.env.INTERNAL_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8080";

/** GET /api/admin/shops/pending → backend GET /api/shop/admin/pending */
export async function GET() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;

  if (!accessToken) {
    return NextResponse.json(
      { success: false, message: "Session expired" },
      { status: 401 }
    );
  }

  const res = await fetch(`${API_BASE}/api/shop/admin/pending`, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  const json = await res.json();

  // Parse JSON string fields
  if (json.success && Array.isArray(json.data)) {
    json.data = json.data.map(parseShopJsonFields);
  }

  return NextResponse.json(json, { status: res.status });
}

function parseShopJsonFields(shop: Record<string, unknown>) {
  return {
    ...shop,
    openingHours:
      typeof shop.openingHours === "string"
        ? JSON.parse(shop.openingHours)
        : (shop.openingHours ?? null),
    tags:
      typeof shop.tags === "string"
        ? JSON.parse(shop.tags)
        : (shop.tags ?? null),
  };
}
