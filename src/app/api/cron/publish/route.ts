import { revalidatePath } from "next/cache";
import type { NextRequest } from "next/server";
import type { PostRow } from "@/lib/db";
import { sendNewPost } from "@/lib/newsletter";
import { serviceClient } from "@/lib/supabase/service";

/**
 * Runs every ~10 minutes (cron-job.org, or Vercel Cron), with the header
 * `Authorization: Bearer <CRON_SECRET>`:
 *  - emails subscribers about scheduled stories that have just gone live
 *  - refreshes the site's pages when a scheduled story goes live
 *  - and, as a side effect, keeps the free Supabase project from pausing.
 */
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const db = serviceClient();
  const now = new Date();

  // Scheduled stories that are now live and still owe their email.
  const due = await db
    .from("posts")
    .select("*")
    .eq("published", true)
    .eq("notify_pending", true)
    .lte("publish_at", now.toISOString())
    .is("notified_at", null)
    .returns<PostRow[]>();
  if (due.error) return Response.json({ error: due.error.message }, { status: 500 });

  const emailed: { slug: string; sent: number; error?: string }[] = [];
  for (const post of due.data) {
    // Claim it first, so overlapping runs can never send it twice.
    const { data: claimed } = await db
      .from("posts")
      .update({ notified_at: now.toISOString(), notify_pending: false, notified_count: null, notify_error: null })
      .eq("slug", post.slug)
      .is("notified_at", null)
      .eq("notify_pending", true)
      .select("slug")
      .maybeSingle();
    if (!claimed) continue;
    const { sent, error } = await sendNewPost(db, post);
    await db
      .from("posts")
      .update({
        notified_count: sent,
        notify_error: error ?? null,
        // Nothing went out: try again on the next run.
        ...(error && sent === 0 ? { notified_at: null, notify_pending: true } : {}),
      })
      .eq("slug", post.slug);
    emailed.push({ slug: post.slug, sent, ...(error ? { error } : {}) });
  }

  // Pages show stories as they go live: refresh them if one did since the last runs.
  const recent = await db
    .from("posts")
    .select("slug", { count: "exact", head: true })
    .eq("published", true)
    .gt("publish_at", new Date(now.getTime() - 30 * 60 * 1000).toISOString())
    .lte("publish_at", now.toISOString());
  const refreshed = (recent.count ?? 0) > 0 || emailed.length > 0;
  if (refreshed) revalidatePath("/", "layout");

  return Response.json({ ok: true, emailed, refreshed });
}
