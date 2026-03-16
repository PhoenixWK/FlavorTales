import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const API_BASE =
  process.env.INTERNAL_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8080";

/**
 * POST /api/file/upload  →  backend POST /api/file/upload
 * Forwards a multipart image upload to the backend, which stores it in Cloudflare R2.
 * Returns { fileId, fileUrl, mimeType, sizeBytes }.
 */
export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;

  if (!accessToken) {
    return NextResponse.json(
      { success: false, message: "Session expired" },
      { status: 401 }
    );
  }

  // Forward the multipart form data as-is to the backend
  const formData = await request.formData();

  const res = await fetch(`${API_BASE}/api/file/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      // Do NOT set Content-Type – let fetch derive the multipart boundary
    },
    body: formData,
  });

  const json = await res.json();
  return NextResponse.json(json, { status: res.status });
}
