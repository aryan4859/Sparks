import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Full-access client using the secret key, for scheduled jobs that run without a
 * signed-in admin (src/app/api/cron). Server-only: never import it in a component
 * that reaches the browser.
 */
export function serviceClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("SUPABASE_SECRET_KEY isn't set on the server (needed for scheduled publishing).");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
