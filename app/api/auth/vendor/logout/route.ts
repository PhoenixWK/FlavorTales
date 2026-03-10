import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

// INTERNAL_API_BASE_URL is used for server-side container-to-container calls (Docker).
// Falls back to NEXT_PUBLIC_API_BASE_URL for local dev where both run on localhost.
const API_BASE =
  process.env.INTERNAL_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8080";

/**
 * POST /api/auth/vendor/logout  (Next.js proxy route)
 *
 * Reads the access_token from the frontend-domain cookie, forwards it to the
 * Spring Boot backend (via Authorization header) for blacklisting, and then
 * clears the access_token and refresh_token cookies on the frontend domain.
 */
export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;

  // Detect if the request came over HTTPS
  const isHttps =
    request.url.startsWith("https://") ||
    request.headers.get("x-forwarded-proto") === "https";

  // Best-effort: tell the backend to blacklist the token
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

  // Clear both cookies on the frontend domain
  response.cookies.set("access_token", "", {
    httpOnly: true,
    secure: isHttps,
    path: "/",
    maxAge: 0,
    sameSite: "lax",
  });

  response.cookies.set("refresh_token", "", {
    httpOnly: true,
    secure: isHttps,
    path: "/api/auth/vendor/refresh",
    maxAge: 0,
    sameSite: "lax",
  });

  return response;
}
