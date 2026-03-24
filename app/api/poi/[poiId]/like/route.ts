import { NextRequest, NextResponse } from "next/server";

const API_BASE =
  process.env.INTERNAL_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8080";

/**
 * POST /api/poi/[poiId]/like  →  backend POST /api/poi/{poiId}/like
 *
 * FR-LM-007: Anonymous tourist likes a POI.
 * Public endpoint — no JWT required, identified only by X-Session-Id header.
 * Returns the updated likes_count wrapped in ApiResponse<Integer>.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ poiId: string }> }
) {
  const { poiId } = await params;
  const sessionId = request.headers.get("X-Session-Id");

  const res = await fetch(`${API_BASE}/api/poi/${poiId}/like`, {
    method: "POST",
    headers: sessionId ? { "X-Session-Id": sessionId } : {},
  });

  const json = await res.json();
  return NextResponse.json(json, { status: res.status });
}

/**
 * DELETE /api/poi/[poiId]/like  →  backend DELETE /api/poi/{poiId}/like
 *
 * FR-LM-007: Anonymous tourist unlikes a POI.
 * Public endpoint — no JWT required, identified only by X-Session-Id header.
 * Returns the updated likes_count wrapped in ApiResponse<Integer>.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ poiId: string }> }
) {
  const { poiId } = await params;
  const sessionId = request.headers.get("X-Session-Id");

  const res = await fetch(`${API_BASE}/api/poi/${poiId}/like`, {
    method: "DELETE",
    headers: sessionId ? { "X-Session-Id": sessionId } : {},
  });

  const json = await res.json();
  return NextResponse.json(json, { status: res.status });
}
