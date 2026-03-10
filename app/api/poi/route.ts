import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const API_BASE =
  process.env.INTERNAL_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8080";

/**
 * GET /api/poi  →  backend GET /api/poi
 * Returns all active POIs (public, no auth required).
 */
export async function GET() {
  const res = await fetch(`${API_BASE}/api/poi`, { method: "GET" });
  const json = await res.json();
  return NextResponse.json(json, { status: res.status });
}

/**
 * POST /api/poi  →  backend POST /api/poi
 * Creates a new POI for the authenticated vendor.
 * Reads the access_token from the frontend-domain cookie and forwards it
 * as an Authorization header so the stateless backend can authenticate the request.
 */
export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;

  if (!accessToken) {
    return NextResponse.json(
      { success: false, message: "Session expired" },
      { status: 401 }
    );
  }

  const body = await request.json();

  const res = await fetch(`${API_BASE}/api/poi`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });

  const json = await res.json();
  return NextResponse.json(json, { status: res.status });
}
