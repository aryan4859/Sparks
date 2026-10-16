import Image from "next/image";
import Link from "next/link";
import { PlaceGrid } from "@/components/PlaceCard";
import { PostCard } from "@/components/PostCard";
import { categories } from "@/lib/site";
import { ListCard } from "@/components/ListCard";
import { getAreas, getFeatured, getLatest, getLists, getPlaces, getPlacesBySlugs, getPosts } from "@/lib/queries";
import type { Category } from "@/lib/types";

// Re-check every 10 minutes, so scheduled stories appear on time even without the cron job.
export const revalidate = 600;

export default async function Home() {
  const [featured, latest, posts, areas, lists] = await Promise.all([
    getFeatured(),
    getLatest(4),
    getPosts(),
    getAreas(),
    getLists(),
  ]);
  const listCounts = await Promise.all(lists.slice(0, 3).map(async (l) => (await getPlacesBySlugs(l.places)).length));
  const [hero, ...restFeatured] = featured;
  const byCategory = await Promise.all(
    (Object.keys(categories) as Category[]).map(async (c) => ({ category: c, places: (await getPlaces({ category: c })).slice(0, 4) })),
  );

  return (
    <>
      {/* Hero */}
      <section className="mx-auto max-w-7xl px-4 pt-14 sm:px-6 sm:pt-24">
        <p className="label text-muted">Kathmandu · Patan · Pokhara</p>
        <h1 className="mt-5 max-w-5xl text-5xl font-semibold leading-[1.02] tracking-tight sm:text-8xl">
          Nepal&rsquo;s quiet corners, <span className="font-serif font-normal italic">handpicked.</span>
        </h1>
        <div className="mt-8 flex flex-wrap items-center gap-6">
          <Link href="/explore" className="bg-ink px-6 py-3 text-sm text-paper transition hover:opacity-85">
            Start exploring
          </Link>
          <p className="max-w-sm text-sm text-muted">
            Cafés, kitchens, boutiques and hidden gems — photographed, reviewed and mapped.
          </p>
        </div>
      </section>

      {hero && (
        <section className="mx-auto mt-14 max-w-7xl px-4 sm:px-6">
          <Link href={`/places/${hero.slug}`} className="group relative block aspect-[4/5] overflow-hidden bg-card sm:aspect-[21/9]">
            <Image
              src={hero.gallery[0] ?? hero.cover}
              alt={hero.name}
              fill
              priority
              sizes="100vw"
              className="object-cover transition duration-1000 group-hover:scale-[1.02]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0" />
            <div className="absolute inset-x-0 bottom-0 p-6 text-white sm:p-10">
              <p className="label opacity-80">Featured · {hero.neighborhood}</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight sm:text-5xl">{hero.name}</p>
              <p className="mt-2 max-w-lg font-serif text-xl italic opacity-90">{hero.tagline}</p>
            </div>
          </Link>
        </section>
      )}

      {/* Neighbourhoods */}
      <section className="mx-auto mt-20 max-w-7xl px-4 sm:px-6">
        <SectionHead title="Explore by" accent="neighbourhood" />
        <div className="mt-6 flex flex-wrap gap-2">
          {areas
            .filter((a) => a.name !== "Online")
            .map((area) => (
              <Link
                key={area.slug}
                href={`/areas/${area.slug}`}
                className="rounded-full border border-line px-5 py-2.5 text-sm transition hover:border-ink hover:bg-ink hover:text-paper"
              >
                {area.name}
              </Link>
            ))}
        </div>
      </section>

      {/* Handpicked */}
      <section className="mx-auto mt-24 max-w-7xl px-4 sm:px-6">
        <SectionHead title="Handpicked" accent="spots" href="/explore" />
        <div className="mt-8">
          <PlaceGrid places={restFeatured.slice(0, 4)} />
        </div>
      </section>

      {/* Latest */}
      <section className="mt-24 bg-card py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHead title="New spots" accent="added this week" />
          <div className="mt-8">
            <PlaceGrid places={latest} />
          </div>
        </div>
      </section>

      {/* By category */}
      {byCategory.map(({ category, places }) => (
        <section key={category} className="mx-auto mt-24 max-w-7xl px-4 sm:px-6">
          <SectionHead title={categories[category].plural} href={categories[category].href} />
          <div className="mt-8">
            <PlaceGrid places={places} />
          </div>
        </section>
      ))}

      {/* Lists */}
      {lists.length > 0 && (
        <section className="mx-auto mt-28 max-w-7xl px-4 sm:px-6">
          <SectionHead title="Handpicked" accent="lists" href="/lists" />
          <div className="mt-8 grid gap-x-5 gap-y-12 md:grid-cols-3">
            {lists.slice(0, 3).map((list, i) => (
              <ListCard key={list.slug} list={list} count={listCounts[i]} />
            ))}
          </div>
        </section>
      )}

      {/* Journal */}
      <section className="mx-auto mt-28 max-w-7xl px-4 sm:px-6">
        <SectionHead title="From the" accent="journal" href="/journal" />
        <div className="mt-8 grid gap-x-5 gap-y-12 md:grid-cols-3">
          {posts.slice(0, 3).map((post) => (
            <PostCard key={post.slug} post={post} />
          ))}
        </div>
      </section>
    </>
  );
}

function SectionHead({ title, accent, href }: { title: string; accent?: string; href?: string }) {
  return (
    <div className="flex items-end justify-between gap-6 border-b border-line pb-4">
      <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        {title} {accent && <span className="font-serif font-normal italic">{accent}</span>}
      </h2>
      {href && (
        <Link href={href} className="label shrink-0 text-muted hover:text-ink">
          View all →
        </Link>
      )}
    </div>
  );
}
