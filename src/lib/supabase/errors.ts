import type { PostgrestError } from "@supabase/supabase-js";

/** Turns a Supabase error object into a real Error with an actionable message. */
export function dbError(error: PostgrestError) {
  const hint =
    error.code === "PGRST205"
      ? " — the database tables don't exist yet. Run supabase/schema.sql in the Supabase SQL Editor."
      : "";
  return new Error(`Supabase: ${error.message}${hint}`);
}
