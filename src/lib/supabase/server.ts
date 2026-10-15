import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_KEY, SUPABASE_URL } from "./clients";

/** Cookie-aware client acting as the signed-in user (admin pages and actions). */
export async function sessionClient() {
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // The proxy refreshes the session instead.
        }
      },
    },
  });
}

/** Returns the signed-in admin's email, or null if not signed in / not an admin. */
export async function currentAdmin() {
  const supabase = await sessionClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return null;
  const { data: isAdmin } = await supabase.rpc("is_admin");
  return isAdmin ? { email: (data.claims.email as string | undefined) ?? "" } : null;
}
