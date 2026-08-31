import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { decrypt, SESSION_COOKIE_NAME } from "./session";

// Cached per-request so it's cheap to call from many Server Components/Route
// Handlers without re-verifying the JWT each time -- see the Next.js data
// security guide, which recommends this pattern over relying on proxy.ts alone.
export const verifySession = cache(async () => {
  const cookieStore = await cookies();
  const session = await decrypt(cookieStore.get(SESSION_COOKIE_NAME)?.value);
  if (!session?.authenticated) {
    redirect("/login");
  }
  return session;
});

// For Route Handlers, which should return 401 JSON instead of redirecting.
export async function requireSession(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = await decrypt(cookieStore.get(SESSION_COOKIE_NAME)?.value);
  return Boolean(session?.authenticated);
}
