import { NextRequest, NextResponse } from "next/server";

// INTERNAL_API_BASE_URL is used for server-side container-to-container calls (Docker).
// Falls back to NEXT_PUBLIC_API_BASE_URL for local dev where both run on localhost.
const API_BASE =
  process.env.INTERNAL_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8080";

/**
 * POST /api/auth/vendor/login  (Next.js proxy route)
 *
 * Forwards the login request to the Spring Boot backend and re-sets the
 * access_token cookie on the *frontend* domain.  This is necessary because
 * the frontend and backend run on different hostnames (cross-origin), so any
 * Set-Cookie headers from the backend would be scoped to the backend domain
 * and invisible to the Next.js middleware that guards /vendor/* routes.
 *
 * Flow:
 *   browser → Next.js /api/auth/vendor/login → Spring Boot /api/auth/vendor/login
 *                                             ← JSON { accessToken, refreshToken, … }
 *          ← Set-Cookie: access_token (frontend domain) + JSON forwarded to browser
 */
export async function POST(request: NextRequest) {
  try {
  const body = await request.json();

  // Detect if the request came over HTTPS (works for both direct and proxied connections)
  const isHttps =
    request.url.startsWith("https://") ||
    request.headers.get("x-forwarded-proto") === "https";

  // Forward to backend
  const backendRes = await fetch(`${API_BASE}/api/auth/vendor/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const contentType = backendRes.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return NextResponse.json(
      { success: false, message: `Backend returned an unexpected response (HTTP ${backendRes.status}).` },
      { status: backendRes.status || 502 }
    );
  }

  const json = await backendRes.json();

  if (!backendRes.ok) {
    return NextResponse.json(json, { status: backendRes.status });
  }

  const { accessToken, refreshToken } = json.data ?? {};

  const rememberMe = !!body.rememberMe;
  const regularMaxAge    = 24 * 60 * 60;          // 1 day
  const rememberMaxAge   = 7  * 24 * 60 * 60;     // 7 days
  const refreshMaxAge    = 30 * 24 * 60 * 60;     // 30 days
  const accessMaxAge     = rememberMe ? rememberMaxAge : regularMaxAge;

  const response = NextResponse.json(json, { status: 200 });

  // Set access_token on the frontend domain so Next.js middleware can read it
  // COOKIE_SECURE=false must be set when serving over plain HTTP (e.g. playit.gg tunnel)
  const secureCookie = process.env.COOKIE_SECURE !== "false" && isHttps;
  if (accessToken) {
    response.cookies.set("access_token", accessToken, {
      httpOnly: true,
      secure: secureCookie,
      path: "/",
      maxAge: accessMaxAge,
      sameSite: "lax",      // lax (not strict) so same-site navigation works
    });
  }

  // Set refresh_token scoped to the refresh endpoint proxy
  if (refreshToken) {
    response.cookies.set("refresh_token", refreshToken, {
      httpOnly: true,
      secure: secureCookie,
      path: "/api/auth/vendor/refresh",
      maxAge: refreshMaxAge,
      sameSite: "lax",
    });
  }

  return response;
  } catch (error) {
    const isConnRefused =
      error instanceof TypeError ||
      (error as NodeJS.ErrnoException)?.code === "ECONNREFUSED";
    const message = isConnRefused
      ? "Cannot connect to the backend server. Make sure it is running on port 8080."
      : "Login service is temporarily unavailable. Please try again later.";
    return NextResponse.json({ success: false, message }, { status: 503 });
  }
}
