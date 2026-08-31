import { NextRequest, NextResponse } from "next/server";
import { decrypt, SESSION_COOKIE_NAME } from "@/lib/auth/session";

// Everything in this app is one user's private data (Gmail, calendar, tasks,
// expenses) -- there's no mix of public/protected routes, so the gate applies
// to every request except the login page and the login API itself.
const PUBLIC_PATHS = ["/login", "/api/auth/login"];

// Optimistic check only (cookie decrypt, no DB round-trip) -- per Next's auth
// guide, this is not the only line of defense. Route Handlers under app/api/**
// re-verify with lib/auth/dal.ts's requireSession()/verifySession().
export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    return NextResponse.next();
  }

  const session = await decrypt(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  if (session?.authenticated) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
