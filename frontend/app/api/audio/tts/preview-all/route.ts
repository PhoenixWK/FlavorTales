import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { Agent } from "undici";

// TTS for all 6 languages in parallel — can be slow
export const maxDuration = 900;

const API_BASE =
  process.env.INTERNAL_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8080";

const ttsAgent = new Agent({
  headersTimeout: 0,
  bodyTimeout: 0,
  connectTimeout: 10_000,
});

/**
 * POST /api/audio/tts/preview-all  →  backend POST /api/audio/tts/preview-all
 *
 * Accepts Vietnamese text, auto-translates to all supported languages,
 * synthesises TTS in parallel and returns base64-encoded MP3 per language.
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("access_token")?.value;

    if (!accessToken) {
      return NextResponse.json(
        { success: false, message: "Session expired" },
        { status: 401 }
      );
    }

    const body = await request.json();

    const res = await fetch(`${API_BASE}/api/audio/tts/preview-all`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
      signal: request.signal,
      // @ts-expect-error undici dispatcher is not in the DOM fetch types
      dispatcher: ttsAgent,
    });

    const text = await res.text();
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: `Audio generation failed (HTTP ${res.status})`,
        },
        { status: res.status >= 500 ? 502 : res.status }
      );
    }

    return NextResponse.json(json, { status: res.status });
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      return NextResponse.json(
        { success: false, message: "Request cancelled" },
        { status: 499 }
      );
    }
    const message =
      err instanceof Error ? err.message : "Cannot connect to audio server";
    console.error("[POST /api/audio/tts/preview-all]", err);
    return NextResponse.json({ success: false, message }, { status: 502 });
  }
}
