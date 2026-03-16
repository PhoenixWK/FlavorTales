import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { Agent } from "undici";

// TTS synthesis can take a long time (FPT AI polling, Google Cloud TTS)
export const maxDuration = 900;

const API_BASE =
  process.env.INTERNAL_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8080";

// Disable undici timeouts — backend may poll FPT AI for a long time.
const ttsAgent = new Agent({
  headersTimeout: 0,
  bodyTimeout: 0,
  connectTimeout: 10_000,
});

/**
 * POST /api/audio/preview  →  backend POST /api/audio/tts/preview
 *
 * Generates TTS audio and streams the raw MP3 bytes back to the client.
 * The client creates a local Blob URL for in-browser preview.
 * No R2 upload happens here — that is deferred to form submission.
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

    const res = await fetch(`${API_BASE}/api/audio/tts/preview`, {
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

    if (!res.ok) {
      return NextResponse.json(
        { success: false, message: `TTS preview failed (HTTP ${res.status})` },
        { status: res.status >= 500 ? 502 : res.status }
      );
    }

    const headers: Record<string, string> = { "Content-Type": "audio/mpeg" };
    const contentLength = res.headers.get("content-length");
    if (contentLength) headers["Content-Length"] = contentLength;

    return new NextResponse(res.body, { status: 200, headers });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Cannot connect to audio server";
    console.error("[POST /api/audio/preview]", err);
    return NextResponse.json({ success: false, message }, { status: 502 });
  }
}
