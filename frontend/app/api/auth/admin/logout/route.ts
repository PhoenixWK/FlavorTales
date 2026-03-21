import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const API_BASE =
  process.env.INTERNAL_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8080";

/**
 * POST /api/auth/admin/logout  (Next.js proxy)
 *
 * Reads the `admin_access_token` cookie, blacklists it on the backend, then
 * clears all admin cookies on the frontend domain.
 */
export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("admin_access_token")?.value;

  const isHttps =
    request.url.startsWith("https://") ||
    request.headers.get("x-forwarded-proto") === "https";

  try {
    await fetch(`${API_BASE}/api/auth/vendor/logout`, {
      method: "POST",
      headers: accessToken
        ? { Authorization: `Bearer ${accessToken}` }
        : {},
    });
  } catch {
    // Proceed with cookie clearing even if the backend call fails
  }

  const response = NextResponse.json(
    { success: true, message: "Logout successful" },
    { status: 200 }
  );

  response.cookies.set("admin_access_token", "", {
    httpOnly: true,
    secure: isHttps,
    path: "/",
    maxAge: 0,
    sameSite: "lax",
  });

  response.cookies.set("admin_refresh_token", "", {
    httpOnly: true,
    secure: isHttps,
    path: "/api/auth/admin/refresh",
    maxAge: 0,
    sameSite: "lax",
  });

  return response;
}
