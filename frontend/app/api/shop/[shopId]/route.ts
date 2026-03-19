import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const API_BASE =
  process.env.INTERNAL_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8080";

/**
 * GET /api/shop/[shopId]  →  backend GET /api/shop/my/{shopId}
 * Returns full shop detail (including gallery + audio) for the authenticated vendor.
 * The backend verifies that the shop belongs to the calling vendor.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ shopId: string }> }
) {
  const { shopId } = await params;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;

  if (!accessToken) {
    return NextResponse.json(
      { success: false, message: "Session expired" },
      { status: 401 }
    );
  }

  const res = await fetch(`${API_BASE}/api/shop/my/${shopId}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const json = await res.json();

  // Parse openingHours and tags if they are JSON strings
  if (json.success && json.data) {
    const d = json.data;
    json.data = {
      ...d,
      openingHours:
        typeof d.openingHours === "string"
          ? JSON.parse(d.openingHours)
          : d.openingHours ?? null,
      tags:
        typeof d.tags === "string" ? JSON.parse(d.tags) : d.tags ?? null,
    };
  }

  return NextResponse.json(json, { status: res.status });
}
