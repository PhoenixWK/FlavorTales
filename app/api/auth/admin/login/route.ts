import { NextRequest, NextResponse } from "next/server";

const API_BASE =
  process.env.INTERNAL_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8080";

/**
 * POST /api/auth/admin/login  (Next.js proxy)
 *
 * Forwards credentials to the backend's vendor/admin shared login endpoint and
 * sets `admin_access_token` (instead of `access_token`) so admin and vendor
 * sessions can coexist in the same browser without cookie collision.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const isHttps =
      request.url.startsWith("https://") ||
      request.headers.get("x-forwarded-proto") === "https";

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

    const secureCookie = process.env.COOKIE_SECURE !== "false" && isHttps;
    const accessMaxAge = 24 * 60 * 60;   // 1 day
    const refreshMaxAge = 30 * 24 * 60 * 60; // 30 days

    const response = NextResponse.json(json, { status: 200 });

    if (accessToken) {
      response.cookies.set("admin_access_token", accessToken, {
        httpOnly: true,
        secure: secureCookie,
        path: "/",
        maxAge: accessMaxAge,
        sameSite: "lax",
      });
    }

    if (refreshToken) {
      response.cookies.set("admin_refresh_token", refreshToken, {
        httpOnly: true,
        secure: secureCookie,
        path: "/api/auth/admin/refresh",
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
      ? "Cannot connect to the backend server."
      : "Login service is temporarily unavailable. Please try again later.";
    return NextResponse.json({ success: false, message }, { status: 503 });
  }
}
