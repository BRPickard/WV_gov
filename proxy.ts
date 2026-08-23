import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic gate only — it checks for the presence of a session cookie so
 * anonymous visitors never see a protected shell flash. Real authorisation
 * happens server-side in every page and route handler.
 */
export function proxy(request: NextRequest) {
  // getSessionCookie checks both the plain and __Secure- prefixed cookie names.
  const hasSession = getSessionCookie(request);

  if (!hasSession) {
    const url = new URL("/login", request.url);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/folders/:path*", "/files/:path*", "/admin/:path*"],
};
