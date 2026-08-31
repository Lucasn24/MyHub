import "server-only";
import type { Credentials } from "google-auth-library";
import { getSupabaseClient } from "@/lib/supabase";

// Single-row singleton table (id is always `true`) -- see backend/supabase/schema.sql.
const ROW_ID = true;

type GoogleTokensRow = {
  access_token: string | null;
  refresh_token: string | null;
  scope: string | null;
  token_type: string | null;
  expiry_date: number | null;
};

function rowToCredentials(row: GoogleTokensRow): Credentials {
  return {
    access_token: row.access_token ?? undefined,
    refresh_token: row.refresh_token ?? undefined,
    scope: row.scope ?? undefined,
    token_type: row.token_type ?? undefined,
    expiry_date: row.expiry_date ?? undefined,
  };
}

export async function loadTokens(): Promise<Credentials | null> {
  const { data, error } = await getSupabaseClient()
    .from("google_tokens")
    .select("access_token, refresh_token, scope, token_type, expiry_date")
    .eq("id", ROW_ID)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return rowToCredentials(data as GoogleTokensRow);
}

export async function saveTokens(tokens: Credentials): Promise<void> {
  const { error } = await getSupabaseClient()
    .from("google_tokens")
    .upsert({
      id: ROW_ID,
      access_token: tokens.access_token ?? null,
      refresh_token: tokens.refresh_token ?? null,
      scope: tokens.scope ?? null,
      token_type: tokens.token_type ?? null,
      expiry_date: tokens.expiry_date ?? null,
      updated_at: new Date().toISOString(),
    });

  if (error) throw error;
}

export async function hasTokens(): Promise<boolean> {
  const { data, error } = await getSupabaseClient()
    .from("google_tokens")
    .select("id")
    .eq("id", ROW_ID)
    .maybeSingle();

  if (error) throw error;
  return data !== null;
}
