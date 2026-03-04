import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

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
  const body = await request.json();

  // Forward to backend
  const backendRes = await fetch(`${API_BASE}/api/auth/vendor/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

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
  if (accessToken) {
    response.cookies.set("access_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: accessMaxAge,
      sameSite: "lax",      // lax (not strict) so same-site navigation works
    });
  }

  // Set refresh_token scoped to the refresh endpoint proxy
  if (refreshToken) {
    response.cookies.set("refresh_token", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/api/auth/vendor/refresh",
      maxAge: refreshMaxAge,
      sameSite: "lax",
    });
  }

  return response;
}
