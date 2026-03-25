import { NextResponse } from "next/server";

const API_BASE =
  process.env.INTERNAL_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8080";

/**
 * POST /api/tourist/sessions  →  backend POST /api/tourist/sessions
 * Creates a new anonymous tourist session.
 */
export async function POST() {
  try {
    const res = await fetch(`${API_BASE}/api/tourist/sessions`, { method: "POST" });
    const json = await res.json();
    return NextResponse.json(json, { status: res.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Cannot connect to server";
    return NextResponse.json({ success: false, message }, { status: 502 });
  }
}
