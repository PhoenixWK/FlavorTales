import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const API_BASE =
  process.env.INTERNAL_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8080";

interface RouteParams {
  params: Promise<{ shopId: string }>;
}

/** PATCH /api/admin/shops/[shopId]/approve → backend PATCH /api/shop/admin/{shopId}/approve */
export async function PATCH(_req: NextRequest, { params }: RouteParams) {
  const { shopId } = await params;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;

  if (!accessToken) {
    return NextResponse.json(
      { success: false, message: "Session expired" },
      { status: 401 }
    );
  }

  const res = await fetch(`${API_BASE}/api/shop/admin/${shopId}/approve`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const json = await res.json();
  return NextResponse.json(json, { status: res.status });
}
