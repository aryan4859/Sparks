"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { placeToRow, type PostRow } from "@/lib/db";
import { currentAdmin, sessionClient } from "@/lib/supabase/server";
import type { Place } from "@/lib/types";

export type FormState = { error?: string } | undefined;

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Every mutation re-checks admin status; RLS enforces it again in the database. */
async function requireAdmin() {
  const admin = await currentAdmin();
  if (!admin) redirect("/admin/login");
  return sessionClient();
}

function refreshSite() {
  revalidatePath("/", "layout");
}

/** Where to go after saving: back to the (filtered) admin list the editor came from. */
function returnPath(formData: FormData, fallback: string) {
  const back = String(formData.get("returnTo") ?? "");
  return back.startsWith("/admin") && !back.startsWith("//") ? back : fallback;
}

// ─── Auth ────────────────────────────────────────────────────────────────

export async function signIn(_: FormState, formData: FormData): Promise<FormState> {
  const supabase = await sessionClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });
  if (error) return { error: error.message };

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) {
    await supabase.auth.signOut();
    return { error: "This account isn't an admin yet — add it to the admins table (see supabase/schema.sql)." };
  }
  redirect("/admin");
}

export async function signOut() {
  const supabase = await sessionClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

// ─── Places ──────────────────────────────────────────────────────────────

export async function savePlace(_: FormState, formData: FormData): Promise<FormState> {
  const supabase = await requireAdmin();
  const isNew = formData.get("isNew") === "1";

  let place: Place;
  try {
    place = JSON.parse(String(formData.get("payload")));
  } catch {
    return { error: "Couldn't read the form — please try again." };
  }

  if (!place.name?.trim()) return { error: "Name is required." };
  if (!SLUG.test(place.slug)) return { error: "Slug may only contain lowercase letters, numbers and single hyphens." };
  const publishing = place.published !== false;
  if (publishing && !place.cover) {
    return { error: "Add a cover photo before publishing — or untick “Published” to save it as a draft." };
  }
  if (!place.online) {
    const loc = place.location;
    if (!loc || !Number.isFinite(loc.lat) || !Number.isFinite(loc.lng) || (loc.lat === 0 && loc.lng === 0)) {
      return { error: "Add a location (paste a Google Maps link), or mark it as an online-only store." };
    }
  }

  // Drop blank rows left over from the editor.
  place.signature = place.signature.filter((i) => i.name.trim());
  place.menu = place.menu
    .map((s) => ({ ...s, items: s.items.filter((i) => i.name.trim()) }))
    .filter((s) => s.title.trim() || s.items.length);

  // Drafts may be renamed; published places keep their URL (enforced again here).
  const originalSlug = String(formData.get("originalSlug") || place.slug);
  if (!isNew && originalSlug !== place.slug) {
    const { data: current } = await supabase.from("places").select("published").eq("slug", originalSlug).maybeSingle();
    if (current?.published) return { error: "Published places keep their URL — the slug can't be changed." };
  }

  const row = placeToRow(place);
  const { error } = isNew
    ? await supabase.from("places").insert(row)
    : await supabase.from("places").update({ ...row, updated_at: new Date().toISOString() }).eq("slug", originalSlug);

  if (error) {
    return { error: error.code === "23505" ? "A place with this slug already exists." : error.message };
  }
  refreshSite();
  redirect(returnPath(formData, "/admin"));
}

export async function deletePlace(slug: string) {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("places").delete().eq("slug", slug);
  if (error) throw new Error(error.message);
  refreshSite();
  redirect("/admin");
}

// ─── Posts ───────────────────────────────────────────────────────────────

export async function savePost(_: FormState, formData: FormData): Promise<FormState> {
  const supabase = await requireAdmin();
  const isNew = formData.get("isNew") === "1";

  const row: PostRow = {
    slug: String(formData.get("slug") ?? "").trim(),
    title: String(formData.get("title") ?? "").trim(),
    excerpt: String(formData.get("excerpt") ?? "").trim(),
    cover: String(formData.get("cover") ?? ""),
    date: String(formData.get("date") ?? ""),
    body: String(formData.get("body") ?? ""),
    published: formData.get("published") === "on",
  };

  if (!row.title) return { error: "Title is required." };
  if (!SLUG.test(row.slug)) return { error: "Slug may only contain lowercase letters, numbers and single hyphens." };
  if (row.published && !row.cover) {
    return { error: "Add a cover photo before publishing — or untick “Published” to save it as a draft." };
  }

  const { error } = isNew
    ? await supabase.from("posts").insert(row)
    : await supabase.from("posts").update({ ...row, updated_at: new Date().toISOString() }).eq("slug", row.slug);

  if (error) {
    return { error: error.code === "23505" ? "A post with this slug already exists." : error.message };
  }
  refreshSite();
  redirect("/admin?tab=journal");
}

export async function deletePost(slug: string) {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("posts").delete().eq("slug", slug);
  if (error) throw new Error(error.message);
  refreshSite();
  redirect("/admin?tab=journal");
}

