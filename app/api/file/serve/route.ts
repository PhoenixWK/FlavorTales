import { NextRequest, NextResponse } from "next/server";
import { isPrivateR2Url, buildSignedR2Request } from "@/shared/utils/r2Signing";

/**
 * GET /api/file/serve?url=<encoded-r2-url>
 *
 * Server-side proxy that fetches images/files from Cloudflare R2 and streams
 * them to the browser.  When the URL uses the private R2 storage endpoint it
 * is signed with AWS Signature V4 before fetching.
 */

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

  const r2Base = (process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? "").replace(
    /\/$/,
    ""
  );
  if (r2Base) {
    try {
      const r2Host = new URL(r2Base).hostname.toLowerCase();
      if (hostname === r2Host) return true;
    } catch {
      // ignore misconfigured env var
    }
  }

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

  try {
    let fetchUrl = url;
    let fetchHeaders: Record<string, string> = {};

    if (isPrivateR2Url(url)) {
      const signed = buildSignedR2Request(url);
      fetchUrl = signed.url;
      fetchHeaders = signed.headers;
    }

    const res = await fetch(fetchUrl, { headers: fetchHeaders });

    const responseHeaders: Record<string, string> = {
      "Cache-Control": "public, max-age=3600",
    };

    const contentType = res.headers.get("content-type");
    if (contentType) responseHeaders["Content-Type"] = contentType;

    const contentLength = res.headers.get("content-length");
    if (contentLength) responseHeaders["Content-Length"] = contentLength;

    return new NextResponse(res.body, {
      status: res.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("[GET /api/file/serve]", error);
    return new NextResponse("Failed to fetch file from storage", {
      status: 502,
    });
  }
}
