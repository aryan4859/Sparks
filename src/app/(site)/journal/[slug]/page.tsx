import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { parsePostBody, readingMinutes } from "@/lib/markdown";
import { budgetLabel, categories, formatDate } from "@/lib/site";
import { getPlace, getPost, getPosts } from "@/lib/queries";
import type { PostBlock } from "@/lib/types";

export async function generateStaticParams() {
  return (await getPosts()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/journal/[slug]">): Promise<Metadata> {
  const post = await getPost((await params).slug);
  if (!post) return {};
  return { title: post.title, description: post.excerpt, openGraph: { images: [post.cover] } };
}

export default async function PostPage({ params }: PageProps<"/journal/[slug]">) {
  const post = await getPost((await params).slug);
  if (!post) notFound();

  return (
    <article>
      <header className="mx-auto max-w-3xl px-4 pt-14 text-center sm:px-6 sm:pt-20">
        <p className="label text-muted">
          {formatDate(post.date)} · {readingMinutes(post.body)} min read
        </p>
        <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-6xl">{post.title}</h1>
        <p className="mt-5 font-serif text-2xl italic text-muted">{post.excerpt}</p>
      </header>
      <div className="mx-auto mt-12 max-w-6xl sm:px-6">
        <div className="relative aspect-[16/9] bg-card">
          <Image src={post.cover} alt="" fill priority sizes="100vw" className="object-cover" />
        </div>
      </div>
      <div className="mx-auto mt-14 max-w-2xl space-y-6 px-4 text-lg leading-relaxed sm:px-6">
        {parsePostBody(post.body).map((block, i) => (
          <Block key={i} block={block} />
        ))}
      </div>
      <div className="mx-auto mt-16 max-w-2xl px-4 sm:px-6">
        <Link href="/journal" className="label text-muted hover:text-ink">← All stories</Link>
      </div>
    </article>
  );
}

async function Block({ block }: { block: PostBlock }) {
  switch (block.type) {
    case "p":
      return <p>{block.text}</p>;
    case "h":
      return <h2 className="pt-6 text-2xl font-semibold tracking-tight">{block.text}</h2>;
    case "img":
      return (
        <figure className="-mx-4 py-4 sm:-mx-16">
          <div className="relative aspect-[16/10] bg-card">
            <Image src={block.src} alt={block.caption ?? ""} fill sizes="(min-width: 768px) 800px, 100vw" className="object-cover" />
          </div>
          {block.caption && <figcaption className="mt-2 px-4 text-sm text-muted sm:px-16">{block.caption}</figcaption>}
        </figure>
      );
    case "place": {
      const place = await getPlace(block.slug);
      if (!place) return null;
      return (
        <Link href={`/places/${place.slug}`} className="group flex gap-4 border-y border-line py-4 text-base">
          <div className="relative aspect-square w-20 shrink-0 overflow-hidden bg-card">
            <Image src={place.cover} alt="" fill sizes="80px" className="object-cover" />
          </div>
          <div>
            <p className="label text-muted">
              {categories[place.category].label} · {place.neighborhood} · {budgetLabel[place.budget]}
            </p>
            <p className="mt-1 font-medium group-hover:underline">{place.name}</p>
            <p className="text-sm text-muted">{place.tagline}</p>
          </div>
        </Link>
      );
    }
  }
}
