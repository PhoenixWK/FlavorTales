import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const API_BASE =
  process.env.INTERNAL_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8080";

/**
 * POST /api/audio/shop/[shopId]/upload  →  backend POST /api/audio/shop/{shopId}/upload
 * Forwards a multipart audio blob to the backend, which uploads it to R2
 * and creates an audio record linked to the shop.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ shopId: string }> }
) {
  const { shopId } = await params;
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("access_token")?.value;
    if (!accessToken) {
      return NextResponse.json({ success: false, message: "Session expired" }, { status: 401 });
    }

    const formData = await request.formData();
    const res = await fetch(`${API_BASE}/api/audio/shop/${shopId}/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        // Do NOT set Content-Type — fetch derives multipart boundary automatically
      },
      body: formData,
    });

    const json = await res.json();
    return NextResponse.json(json, { status: res.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Cannot connect to audio server";
    console.error(`[POST /api/audio/shop/${shopId}/upload]`, err);
    return NextResponse.json({ success: false, message }, { status: 502 });
  }
}
