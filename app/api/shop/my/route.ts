import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const API_BASE =
  process.env.INTERNAL_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8080";

/**
 * GET /api/shop/my  →  backend GET /api/shop/my
 * Returns shops belonging to the authenticated vendor.
 * Parses the openingHours and tags JSON strings into objects.
 */
export async function GET() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;

  if (!accessToken) {
    return NextResponse.json(
      { success: false, message: "Session expired" },
      { status: 401 }
    );
  }

  const res = await fetch(`${API_BASE}/api/shop/my`, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const json = await res.json();

  if (json.success && Array.isArray(json.data)) {
    json.data = json.data.map((shop: Record<string, unknown>) => ({
      ...shop,
      openingHours: typeof shop.openingHours === "string"
        ? JSON.parse(shop.openingHours)
        : shop.openingHours ?? null,
      tags: typeof shop.tags === "string"
        ? JSON.parse(shop.tags)
        : shop.tags ?? null,
    }));
  }

  return NextResponse.json(json, { status: res.status });
}
