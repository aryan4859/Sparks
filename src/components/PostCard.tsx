import Image from "next/image";
import Link from "next/link";
import { readingMinutes } from "@/lib/markdown";
import { formatDate } from "@/lib/site";
import type { Post } from "@/lib/types";

export function PostCard({ post }: { post: Post }) {
  return (
    <Link href={`/journal/${post.slug}`} className="group block">
      <div className="relative aspect-[3/2] overflow-hidden bg-card">
        <Image
          src={post.cover}
          alt=""
          fill
          sizes="(min-width: 768px) 33vw, 100vw"
          className="object-cover transition duration-700 group-hover:scale-[1.03]"
        />
      </div>
      <p className="label mt-4 text-muted">
        {formatDate(post.date)} · {readingMinutes(post.body)} min read
      </p>
      <h3 className="mt-2 text-xl font-medium tracking-tight group-hover:underline">{post.title}</h3>
      <p className="mt-2 text-sm text-muted">{post.excerpt}</p>
    </Link>
  );
}
