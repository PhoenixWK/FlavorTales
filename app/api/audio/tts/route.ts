import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { Agent } from "undici";

// Allow this route to run up to 15 minutes (TTS + R2 upload can be slow)
export const maxDuration = 900;

const API_BASE =
  process.env.INTERNAL_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8080";

// Disable undici timeouts entirely — backend polls FPT AI indefinitely,
// so any fixed ceiling will eventually be hit.  The backend itself is
// responsible for terminating the request (success or permanent error).
const ttsAgent = new Agent({
  headersTimeout: 0,
  bodyTimeout: 0,
  connectTimeout: 10_000, // still fail fast if the backend is unreachable
});

/**
 * POST /api/audio/tts  →  backend POST /api/audio/tts
 * Sends narration text to the backend, which generates:
 *   - Vietnamese audio via FPT AI Voice Maker
 *   - English audio via Google Cloud TTS
 * Both files are uploaded to Cloudflare R2 and file IDs + URLs are returned.
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

    const res = await fetch(`${API_BASE}/api/audio/tts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
      // @ts-expect-error undici dispatcher is not in the DOM fetch types
      dispatcher: ttsAgent,
    });

    const text = await res.text();
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      // Backend returned a non-JSON body (e.g. empty 500, HTML error page)
      return NextResponse.json(
        {
          success: false,
          message: `Lỗi từ máy chủ audio (HTTP ${res.status}). Vui lòng thử lại sau.`,
        },
        { status: res.status >= 500 ? 502 : res.status }
      );
    }

    return NextResponse.json(json, { status: res.status });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Không thể kết nối đến máy chủ.";
    console.error("[POST /api/audio/tts]", err);
    return NextResponse.json(
      { success: false, message },
      { status: 502 }
    );
  }
}
