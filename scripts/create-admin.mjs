// Create (or promote) an admin account for the Sparks dashboard.
//
//   npm run create-admin -- you@example.com "a-strong-password"
//
// Needs SUPABASE_SECRET_KEY in .env (Supabase → Project Settings → API Keys →
// "Secret keys"). It's only used by this script — never prefix it with
// NEXT_PUBLIC_ and never commit it.

import { createClient } from "@supabase/supabase-js";

const [email, password] = process.argv.slice(2);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;

function fail(msg) {
  console.error(`\n✖ ${msg}\n`);
  process.exit(1);
}

if (!email || !password) fail('Usage: npm run create-admin -- you@example.com "a-strong-password"');
if (password.length < 8) fail("Use a password of at least 8 characters.");
if (!url) fail("NEXT_PUBLIC_SUPABASE_URL is missing from .env");
if (!secret) fail("SUPABASE_SECRET_KEY is missing from .env (Supabase → Project Settings → API Keys → Secret keys)");

const supabase = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });

// 1. Create the login — or reuse it (and reset its password) if the email already exists.
let userId;
const created = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
if (created.data?.user) {
  userId = created.data.user.id;
  console.log(`✔ Created login for ${email}`);
} else {
  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (error) fail(`Couldn't create or look up the user: ${created.error?.message ?? error.message}`);
  const existing = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!existing) fail(`Couldn't create the user: ${created.error?.message}`);
  userId = existing.id;
  const upd = await supabase.auth.admin.updateUserById(userId, { password, email_confirm: true });
  if (upd.error) fail(`User exists but the password couldn't be updated: ${upd.error.message}`);
  console.log(`✔ ${email} already existed — password updated`);
}

// 2. Grant admin rights (the secret key bypasses row-level security).
const { error: adminError } = await supabase.from("admins").upsert({ user_id: userId }, { onConflict: "user_id" });
if (adminError) {
  fail(
    adminError.code === "PGRST205" || adminError.code === "42P01"
      ? "The admins table doesn't exist — run supabase/schema.sql in the Supabase SQL Editor first."
      : `Couldn't grant admin rights: ${adminError.message}`,
  );
}
console.log(`✔ ${email} is now an admin\n\n  Sign in at http://localhost:3000/admin/login\n`);
