import { NextResponse } from "next/server";
import crypto from "crypto";
import { getOAuthClient, GOOGLE_SCOPES } from "@/lib/google/oauthClient";
import { requireSession } from "@/lib/auth/dal";

export async function GET() {
  if (!(await requireSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const state = crypto.randomBytes(16).toString("hex");

  const client = getOAuthClient();
  const authUrl = client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: GOOGLE_SCOPES,
    state,
  });

  const response = NextResponse.redirect(authUrl);
  response.cookies.set("google_oauth_state", state, {
    httpOnly: true,
    maxAge: 60 * 10,
    path: "/",
  });
  return response;
}
