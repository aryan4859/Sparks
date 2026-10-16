"use client";

import Image from "next/image";
import { PostHeading, PostImage, PostParagraph } from "@/components/PostBlocks";
import { parsePostBody, readingMinutes } from "@/lib/markdown";
import { formatDate } from "@/lib/site";
import type { Post } from "@/lib/types";
import { isAllowedImage } from "@/lib/validate";

/** The story as it will look on the site, rendered with the same pieces as the live page. */
export function StoryPreview({ post, places }: { post: Post; places: { slug: string; name: string }[] }) {
  const names = new Map(places.map((p) => [p.slug, p.name]));
  return (
    <div className="max-h-[70vh] overflow-y-auto border border-line bg-paper px-4 py-10 sm:px-8">
      <header className="mx-auto max-w-2xl text-center">
        <p className="label text-muted">
          {post.date ? formatDate(post.date) : "No date"} · {readingMinutes(post.body)} min read
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">{post.title || "Untitled story"}</h1>
        {post.excerpt && <p className="mt-4 font-serif text-xl italic text-muted">{post.excerpt}</p>}
      </header>
      {post.cover && isAllowedImage(post.cover) && (
        <div className="relative mx-auto mt-8 aspect-[16/9] max-w-3xl bg-card">
          <Image src={post.cover} alt="" fill sizes="800px" className="object-cover" />
        </div>
      )}
      <div className="mx-auto mt-10 max-w-2xl space-y-6 text-lg leading-relaxed">
        {parsePostBody(post.body).map((block, i) => {
          switch (block.type) {
            case "p":
              return <PostParagraph key={i} text={block.text} />;
            case "h":
              return <PostHeading key={i} text={block.text} />;
            case "img":
              return <PostImage key={i} src={block.src} caption={block.caption} />;
            case "place":
              return (
                <p key={i} className="border-y border-line py-4 text-base text-muted">
                  Place card: <span className="text-ink">{names.get(block.slug) ?? `${block.slug} (not found — check the slug)`}</span>
                </p>
              );
          }
        })}
        {!post.body.trim() && <p className="text-muted">Nothing written yet.</p>}
      </div>
    </div>
  );
}
