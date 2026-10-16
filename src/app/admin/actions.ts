"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { placeToRow, type PostRow } from "@/lib/db";
import { parsePostBody } from "@/lib/markdown";
import { newsletterReady, sendNewPlace, sendNewPost } from "@/lib/newsletter";
import { safeAdminPath } from "@/lib/site";
import { currentAdmin, sessionClient } from "@/lib/supabase/server";
import type { Place } from "@/lib/types";
import { cleanHttpUrl, isAllowedImage } from "@/lib/validate";

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

/**
 * Supabase reports no error when an update or delete matches no rows (the row is
 * gone, or RLS hid it), so writes ask for the affected rows back and check them.
 */
const GONE = "It may have been deleted in another tab — go back to the list and reload.";

/**
 * Emails subscribers about a place or story, at most once. Claiming notified_at
 * first means a double submit or a later edit can never send it twice. Sending
 * runs after the response, so saving doesn't wait on hundreds of emails; the
 * outcome is stored on the row so the editor can show it.
 */
async function emailSubscribersOnce(
  supabase: Awaited<ReturnType<typeof sessionClient>>,
  table: "posts" | "places",
  slug: string,
  label: string,
  send: () => Promise<{ sent: number; error?: string }>,
) {
  if (!newsletterReady) return;
  const { data: claimed, error: claimError } = await supabase
    .from(table)
    .update({ notified_at: new Date().toISOString(), notified_count: null, notify_error: null })
    .eq("slug", slug)
    .is("notified_at", null)
    .select("slug")
    .maybeSingle();
  if (claimError) {
    console.error(`Newsletter: couldn't start sending ${label} — ${claimError.message}. Has supabase/schema.sql been re-run?`);
    return;
  }
  if (!claimed) return; // already emailed

  after(async () => {
    const { sent, error } = await send();
    if (error) console.error(`Newsletter: ${label} stopped after ${sent} emails — ${error}`);
    else console.log(`Newsletter: ${label} sent to ${sent} subscribers`);
    const { error: saveError } = await supabase
      .from(table)
      .update({
        notified_count: sent,
        notify_error: error ?? null,
        // Nothing went out, so let the admin try again with the checkbox.
        ...(error && sent === 0 ? { notified_at: null } : {}),
      })
      .eq("slug", slug);
    if (saveError) console.error(`Newsletter: couldn't record the result for ${label} — ${saveError.message}`);
  });
}

// ─── Auth ────────────────────────────────────────────────────────────────

export async function signIn(_: FormState, formData: FormData): Promise<FormState> {
  const supabase = await sessionClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  });
  if (error) return { error: error.message };

  const { data: isAdmin, error: rpcError } = await supabase.rpc("is_admin");
  if (!isAdmin) {
    await supabase.auth.signOut();
    return {
      error: rpcError
        ? "Couldn't check admin access right now — please try again."
        : "This account isn't an admin yet — add it with npm run create-admin.",
    };
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
    if (!Array.isArray(place.signature) || !Array.isArray(place.menu) || !Array.isArray(place.gallery)) throw new Error();
  } catch {
    return { error: "Couldn't read the form — please try again." };
  }

  place.name = place.name?.trim();
  if (!place.name) return { error: "Name is required." };
  if (!SLUG.test(place.slug)) return { error: "Slug may only contain lowercase letters, numbers and single hyphens." };
  const publishing = place.published !== false;
  if (publishing && !place.cover) {
    return { error: "Add a cover photo before publishing — or untick “Published” to save it as a draft." };
  }
  if ([place.cover, ...place.gallery].some((src) => src && !isAllowedImage(src))) {
    return { error: "Photos must be uploaded here — links to images on other sites aren't supported." };
  }
  if (!place.online) {
    const loc = place.location;
    if (!loc || !Number.isFinite(loc.lat) || !Number.isFinite(loc.lng) || (loc.lat === 0 && loc.lng === 0)) {
      return { error: "Add a location (paste a Google Maps link), or mark it as an online-only store." };
    }
  }
  for (const [key, label] of [["website", "Website"], ["instagram", "Instagram"]] as const) {
    const url = cleanHttpUrl(place[key]);
    if (url === null) return { error: `${label} link must be a web address, like https://example.com` };
    place[key] = url;
  }

  // Drop blank rows left over from the editor.
  place.signature = place.signature.filter((i) => i.name?.trim());
  place.menu = place.menu
    .map((s) => ({ ...s, items: (s.items ?? []).filter((i) => i.name?.trim()) }))
    .filter((s) => s.title?.trim() || s.items.length);

  // Drafts may be renamed; published places keep their URL (enforced again here).
  const originalSlug = String(formData.get("originalSlug") || place.slug);
  if (!isNew && originalSlug !== place.slug) {
    const { data: current } = await supabase.from("places").select("published").eq("slug", originalSlug).maybeSingle();
    if (current?.published) return { error: "Published places keep their URL — the slug can't be changed." };
  }

  const row = placeToRow(place);
  const { data, error } = isNew
    ? await supabase.from("places").insert(row).select("slug")
    : await supabase
        .from("places")
        .update({ ...row, updated_at: new Date().toISOString() })
        .eq("slug", originalSlug)
        .select("slug");

  if (error) {
    return { error: error.code === "23505" ? "A place with this slug already exists." : error.message };
  }
  if (!data?.length) return { error: `This place couldn't be saved. ${GONE}` };
  refreshSite();
  if (publishing && formData.get("notify") === "on") {
    await emailSubscribersOnce(supabase, "places", place.slug, place.name, () => sendNewPlace(supabase, place));
  }
  redirect(safeAdminPath(formData.get("returnTo")));
}

export async function deletePlace(slug: string): Promise<FormState> {
  const supabase = await requireAdmin();
  const { data, error } = await supabase.from("places").delete().eq("slug", slug).select("slug");
  if (error) return { error: error.message };
  if (!data?.length) return { error: `Nothing was deleted. ${GONE}` };
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
  if (!/^\d{4}-\d{2}-\d{2}$/.test(row.date)) return { error: "Pick a date for the story." };
  if (row.published && !row.cover) {
    return { error: "Add a cover photo before publishing — or untick “Published” to save it as a draft." };
  }
  // next/image refuses other hosts, which would take the whole story page down.
  const badImage = [row.cover, ...parsePostBody(row.body).flatMap((b) => (b.type === "img" ? [b.src] : []))].find(
    (src) => src && !isAllowedImage(src),
  );
  if (badImage) {
    return { error: `Photos must be uploaded with “+ Photo” — this image link isn't supported: ${badImage.slice(0, 80)}` };
  }

  const { data, error } = isNew
    ? await supabase.from("posts").insert(row).select("slug")
    : await supabase
        .from("posts")
        .update({ ...row, updated_at: new Date().toISOString() })
        .eq("slug", row.slug)
        .select("slug");

  if (error) {
    return { error: error.code === "23505" ? "A post with this slug already exists." : error.message };
  }
  if (!data?.length) return { error: `This story couldn't be saved. ${GONE}` };
  refreshSite();

  if (row.published && formData.get("notify") === "on") {
    await emailSubscribersOnce(supabase, "posts", row.slug, `“${row.title}”`, () => sendNewPost(supabase, row));
  }
  redirect("/admin?tab=journal");
}

export async function deletePost(slug: string): Promise<FormState> {
  const supabase = await requireAdmin();
  const { data, error } = await supabase.from("posts").delete().eq("slug", slug).select("slug");
  if (error) return { error: error.message };
  if (!data?.length) return { error: `Nothing was deleted. ${GONE}` };
  refreshSite();
  redirect("/admin?tab=journal");
}
