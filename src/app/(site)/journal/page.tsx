import type { Metadata } from "next";
import { PostCard } from "@/components/PostCard";
import { getPosts } from "@/lib/queries";

// Re-check every 10 minutes, so scheduled stories appear on time even without the cron job.
export const revalidate = 600;

export const metadata: Metadata = { title: "Journal" };

export default async function JournalPage() {
  const posts = await getPosts();
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      <header className="max-w-2xl pb-12 pt-14 sm:pt-20">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">
          The <span className="font-serif font-normal italic">journal</span>
        </h1>
        <p className="mt-4 text-muted sm:text-lg">Slow days, long lunches and the places that made them. Notes and photographs from around Nepal.</p>
      </header>
      <div className="grid gap-x-5 gap-y-14 md:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <PostCard key={post.slug} post={post} />
        ))}
      </div>
    </div>
  );
}
