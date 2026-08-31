import "server-only";
import { createClient } from "@supabase/supabase-js";

// Minimal schema typing -- just the table(s) the Next.js app touches directly.
// Everything else (emails/tasks/events/expenses/planner_*) is only ever
// accessed through the Python backend.
type GoogleTokensRow = {
  id: boolean;
  access_token: string | null;
  refresh_token: string | null;
  scope: string | null;
  token_type: string | null;
  expiry_date: number | null;
  updated_at: string;
};

type Database = {
  public: {
    Tables: {
      google_tokens: {
        Row: GoogleTokensRow;
        Insert: Partial<GoogleTokensRow> & { id: boolean };
        Update: Partial<GoogleTokensRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};

let client: ReturnType<typeof createClient<Database>> | null = null;

export function getSupabaseClient() {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (see .env_sample) -- found in your Supabase project's Settings > API."
    );
  }

  client = createClient<Database>(url, key);
  return client;
}
