import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const API_BASE =
  process.env.INTERNAL_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8080";

/**
 * GET /api/audio/poi/[poiId]  →  backend GET /api/audio/poi/{poiId}
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ poiId: string }> }
) {
  const { poiId } = await params;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;
  const headers: Record<string, string> = {};
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
  try {
    const res = await fetch(`${API_BASE}/api/audio/poi/${poiId}`, { headers });
    const json = await res.json();
    return NextResponse.json(json, { status: res.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Cannot connect to audio server";
    return NextResponse.json({ success: false, message }, { status: 502 });
  }
}
