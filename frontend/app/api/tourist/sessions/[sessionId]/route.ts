import { NextRequest, NextResponse } from "next/server";

const API_BASE =
  process.env.INTERNAL_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8080";

/**
 * GET /api/tourist/sessions/[sessionId]  →  backend GET /api/tourist/sessions/{sessionId}
 * Validates an existing anonymous tourist session.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const res = await fetch(
      `${API_BASE}/api/tourist/sessions/${encodeURIComponent(sessionId)}`
    );
    const json = await res.json();
    return NextResponse.json(json, { status: res.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Cannot connect to server";
    return NextResponse.json({ success: false, message }, { status: 502 });
  }
}

/**
 * PATCH /api/tourist/sessions/[sessionId]  →  backend PATCH /api/tourist/sessions/{sessionId}
 * Updates language preference or other session data.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const body = await request.json();
    const res = await fetch(
      `${API_BASE}/api/tourist/sessions/${encodeURIComponent(sessionId)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );
    const json = await res.json();
    return NextResponse.json(json, { status: res.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Cannot connect to server";
    return NextResponse.json({ success: false, message }, { status: 502 });
  }
}
