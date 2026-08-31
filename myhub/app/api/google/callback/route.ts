import { NextRequest, NextResponse } from "next/server";
import { getOAuthClient } from "@/lib/google/oauthClient";
import { saveTokens } from "@/lib/google/tokenStore";
import { requireSession } from "@/lib/auth/dal";

export async function GET(request: NextRequest) {
  // Reachable pre-navigation as Google's own redirect target, but only useful
  // to someone who already has an app session -- otherwise a stranger could
  // hijack the Gmail/Calendar connection by completing this flow themselves.
  if (!(await requireSession())) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const savedState = request.cookies.get("google_oauth_state")?.value;

  if (!code || !state || state !== savedState) {
    return NextResponse.redirect(new URL("/?google_error=invalid_state", request.url));
  }

  const client = getOAuthClient();
  const { tokens } = await client.getToken(code);
  await saveTokens(tokens);

  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.delete("google_oauth_state");
  return response;
}
