import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createSession } from "@/lib/auth/session";

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 60_000;

// Single-instance in-memory limiter -- fine for a low-traffic single-user app.
// Resets on deploy/restart, which is an acceptable tradeoff for the simplicity.
const attemptsByIp = new Map<string, { count: number; lockedUntil: number }>();

function clientIp(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export async function POST(request: NextRequest) {
  const ip = clientIp(request);
  const now = Date.now();
  const entry = attemptsByIp.get(ip);

  if (entry && entry.lockedUntil > now) {
    return NextResponse.json({ error: "Too many attempts. Try again shortly." }, { status: 429 });
  }

  const passwordHash = process.env.AUTH_PASSWORD_HASH;
  if (!passwordHash) {
    throw new Error("Set AUTH_PASSWORD_HASH (see .env_sample)");
  }

  const { password } = await request.json().catch(() => ({ password: "" }));
  const valid = typeof password === "string" && password.length > 0 && (await bcrypt.compare(password, passwordHash));

  if (!valid) {
    const count = (entry?.count ?? 0) + 1;
    attemptsByIp.set(ip, {
      count,
      lockedUntil: count >= MAX_ATTEMPTS ? now + LOCKOUT_MS : 0,
    });
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  attemptsByIp.delete(ip);
  await createSession();
  return NextResponse.json({ success: true });
}
