import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const API_BASE =
  process.env.INTERNAL_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8080";

async function getAccessToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get("access_token")?.value ?? null;
}

/**
 * GET /api/poi/[poiId]  →  backend GET /api/poi/{poiId}
 * Returns a single POI owned by the authenticated vendor.
 * Used to pre-populate the edit form.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ poiId: string }> }
) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      { success: false, message: "Session expired" },
      { status: 401 }
    );
  }

  const { poiId } = await params;
  const res = await fetch(`${API_BASE}/api/poi/${poiId}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const json = await res.json();
  return NextResponse.json(json, { status: res.status });
}

/**
 * PUT /api/poi/[poiId]  →  backend PUT /api/poi/{poiId}
 * Updates a POI owned by the authenticated vendor (FR-PM-004).
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ poiId: string }> }
) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      { success: false, message: "Session expired" },
      { status: 401 }
    );
  }

  const { poiId } = await params;
  const body = await request.json();

  const res = await fetch(`${API_BASE}/api/poi/${poiId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });

  const json = await res.json();
  return NextResponse.json(json, { status: res.status });
}
