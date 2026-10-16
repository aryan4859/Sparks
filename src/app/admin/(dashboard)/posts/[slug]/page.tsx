import { dbError } from "@/lib/supabase/errors";
import Link from "next/link";
import { notFound } from "next/navigation";
import { emptyPost, PostForm } from "@/components/admin/PostForm";
import { postFromRow, type PostRow } from "@/lib/db";
import { newsletterReady } from "@/lib/newsletter";
import { sessionClient } from "@/lib/supabase/server";

export default async function EditPostPage({ params }: PageProps<"/admin/posts/[slug]">) {
  const { slug } = await params;
  const isNew = slug === "new";
  const supabase = await sessionClient();

  const [postRes, placesRes, subscribersRes] = await Promise.all([
    isNew ? null : supabase.from("posts").select("*").eq("slug", slug).maybeSingle<PostRow & { notified_at: string | null }>(),
    supabase.from("places").select("slug, name").order("name").returns<{ slug: string; name: string }[]>(),
    supabase.from("subscribers").select("email", { count: "exact", head: true }).is("unsubscribed_at", null),
  ]);
  if (postRes?.error) throw dbError(postRes.error);
  if (!isNew && !postRes?.data) notFound();

  const post = postRes?.data ? postFromRow(postRes.data) : emptyPost();

  return (
    <div>
      <Link href="/admin?tab=journal" className="label text-muted hover:text-ink">← All stories</Link>
      <h1 className="mb-8 mt-3 text-3xl font-semibold tracking-tight">{isNew ? "New story" : post.title}</h1>
      <PostForm
        initial={post}
        isNew={isNew}
        places={placesRes.data ?? []}
        newsletter={{
          ready: newsletterReady,
          subscribers: subscribersRes.count ?? 0,
          emailedAt: postRes?.data?.notified_at ?? null,
        }}
      />
    </div>
  );
}
