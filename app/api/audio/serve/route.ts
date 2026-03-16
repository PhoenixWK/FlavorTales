import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/audio/serve?url=<encoded-r2-url>
 *
 * Server-side proxy that fetches audio from Cloudflare R2 and streams it
 * to the browser, avoiding CORS / mixed-content / range-request issues.
 *
 * Security: only URLs whose hostname belongs to a Cloudflare R2 domain or
 * matches the app's configured R2 public URL are proxied.
 */

/** Suffixes that identify Cloudflare R2 storage hostnames. */
const ALLOWED_SUFFIXES = [
  ".r2.dev",
  ".r2.cloudflarestorage.com",
  ".cloudflarestorage.com",
];

function isAllowedUrl(raw: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return false;
  }

  const hostname = parsed.hostname.toLowerCase();

  // Allow any URL that starts with the app's configured R2 public base.
  const r2Base = (process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? "").replace(/\/$/, "");
  if (r2Base) {
    try {
      const r2Host = new URL(r2Base).hostname.toLowerCase();
      if (hostname === r2Host) return true;
    } catch {
      // ignore misconfigured env var
    }
  }

  // Otherwise allow known Cloudflare R2 hostname suffixes.
  return ALLOWED_SUFFIXES.some((suffix) => hostname.endsWith(suffix));
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    return new NextResponse("Missing url parameter", { status: 400 });
  }

  if (!isAllowedUrl(url)) {
    return new NextResponse("URL not from an allowed host", { status: 403 });
  }

  // ── Proxy the request ───────────────────────────────────────────────────────
  try {
    const upstreamHeaders: Record<string, string> = {};

    // Forward Range header so the browser can seek inside the audio.
    const range = request.headers.get("range");
    if (range) {
      upstreamHeaders["Range"] = range;
    }

    const res = await fetch(url, { headers: upstreamHeaders });

    const responseHeaders: Record<string, string> = {
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=3600",
    };

    const contentType = res.headers.get("content-type");
    responseHeaders["Content-Type"] = contentType ?? "audio/mpeg";

    const contentLength = res.headers.get("content-length");
    if (contentLength) responseHeaders["Content-Length"] = contentLength;

    const contentRange = res.headers.get("content-range");
    if (contentRange) responseHeaders["Content-Range"] = contentRange;

    return new NextResponse(res.body, {
      status: res.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("[GET /api/audio/serve]", error);
    return new NextResponse("Failed to fetch audio from storage", { status: 502 });
  }
}

