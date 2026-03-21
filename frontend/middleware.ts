import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Route guard for vendor-protected pages.
 *
 * Pages under /vendor/* require a valid `access_token` HTTP-only cookie that
 * Spring Security sets on successful login. If the cookie is absent the user
 * is redirected to the login page, with the original URL preserved in the
 * `from` query param so the login form can redirect back after success.
 *
 * Note: middleware runs on the Edge runtime and has full access to all
 * cookies (including HTTP-only ones), so this is a proper server-side check.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAdmin = pathname.startsWith("/admin");
  const cookieName = isAdmin ? "admin_access_token" : "access_token";
  const token = request.cookies.get(cookieName);

  if (!token) {
    const loginUrl = new URL(
      isAdmin ? "/auth/admin/login" : "/auth/vendor/login",
      request.url
    );
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/vendor/:path*", "/admin/:path*"],
};
