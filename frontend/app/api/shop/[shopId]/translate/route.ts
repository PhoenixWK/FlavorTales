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

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ shopId: string }> }
) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ success: false, message: "Session expired" }, { status: 401 });
  }

  const { shopId } = await params;
  const res = await fetch(`${API_BASE}/api/shop/${shopId}/translate`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const json = await res.json();
  return NextResponse.json(json, { status: res.status });
}
