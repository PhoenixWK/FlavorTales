import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const API_BASE =
  process.env.INTERNAL_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8080";

interface RouteParams {
  params: Promise<{ shopId: string }>;
}

/** GET /api/admin/shops/[shopId] → backend GET /api/shop/admin/{shopId} */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { shopId } = await params;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("admin_access_token")?.value;

  if (!accessToken) {
    return NextResponse.json(
      { success: false, message: "Session expired" },
      { status: 401 }
    );
  }

  try {
    const res = await fetch(`${API_BASE}/api/shop/admin/${shopId}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });

    const json = await res.json();

    if (json.success && json.data) {
      const shop = json.data as Record<string, unknown>;
      json.data = {
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

    return NextResponse.json(json, { status: res.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Cannot connect to backend";
    return NextResponse.json({ success: false, message }, { status: 502 });
  }
}
