import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const API_BASE =
  process.env.INTERNAL_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8080";

/**
 * GET /api/poi/shops/available  →  backend GET /api/poi/shops/available
 * Returns the vendor's active shops that do not yet have a POI linked.
 * Reads the access_token from the frontend-domain cookie and forwards it
 * as an Authorization header so the stateless backend can authenticate the request.
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

  const res = await fetch(`${API_BASE}/api/poi/shops/available`, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const json = await res.json();
  return NextResponse.json(json, { status: res.status });
}
