import { NextRequest, NextResponse } from "next/server";

const API_BASE =
  process.env.INTERNAL_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8080";

/**
 * GET /api/shop/[shopId]/translation/[lang]  →  backend GET /api/shop/{shopId}/translation/{lang}
 * Public endpoint — no auth required (tourists read translated shop content).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ shopId: string; lang: string }> }
) {
  const { shopId, lang } = await params;
  const res = await fetch(`${API_BASE}/api/shop/${shopId}/translation/${lang}`);
  const json = await res.json();
  return NextResponse.json(json, { status: res.status });
}
