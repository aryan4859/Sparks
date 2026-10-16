import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/JsonLd";
import { PlacesMap, type MapPin } from "@/components/map/PlacesMap";
import { OpenBadge } from "@/components/OpenBadge";
import { ShareButtons } from "@/components/ShareButtons";
import { getList, getLists, getPlacesBySlugs } from "@/lib/queries";
import { budgetLabel, categories, siteUrl } from "@/lib/site";

export async function generateStaticParams() {
  return (await getLists()).map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({ params }: PageProps<"/lists/[slug]">): Promise<Metadata> {
  const list = await getList((await params).slug);
  if (!list) return {};
  return {
    title: list.title,
    description: list.intro || undefined,
    alternates: { canonical: `/lists/${list.slug}` },
    openGraph: { title: list.title, description: list.intro || undefined, url: `/lists/${list.slug}`, images: list.cover ? [list.cover] : [] },
  };
}

export default async function ListPage({ params }: PageProps<"/lists/[slug]">) {
  const list = await getList((await params).slug);
  if (!list) notFound();
  const places = await getPlacesBySlugs(list.places);
  const pins: MapPin[] = places.flatMap((p, i) =>
    p.location ? [{ slug: p.slug, name: `${i + 1}. ${p.name}`, label: categories[p.category].label, hours: p.hours, ...p.location }] : [],
  );

  return (
    <article className="mx-auto max-w-7xl px-4 sm:px-6">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: list.title,
          description: list.intro || undefined,
          itemListElement: places.map((p, i) => ({ "@type": "ListItem", position: i + 1, url: `${siteUrl}/places/${p.slug}`, name: p.name })),
        }}
      />
      <header className="max-w-3xl pb-10 pt-14 sm:pt-20">
        <Link href="/lists" className="label text-muted hover:text-ink">← All lists</Link>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-6xl">{list.title}</h1>
        {list.intro && <p className="mt-5 whitespace-pre-line text-lg leading-relaxed text-muted">{list.intro}</p>}
      </header>

      <div className="grid gap-10 lg:grid-cols-[1fr_minmax(0,0.8fr)]">
        <ol className="space-y-10">
          {places.map((p, i) => (
            <li key={p.slug}>
              <Link href={`/places/${p.slug}`} className="group grid gap-4 sm:grid-cols-[200px_1fr] sm:gap-6">
                <div className="relative aspect-[4/3] overflow-hidden bg-card">
                  <Image src={p.cover} alt={p.name} fill sizes="(min-width: 640px) 200px, 100vw" className="object-cover transition duration-700 group-hover:scale-[1.03]" />
                  <OpenBadge hours={p.hours} className="absolute left-2 top-2" />
                </div>
                <div>
                  <p className="label text-muted">
                    {String(i + 1).padStart(2, "0")} · {categories[p.category].label} · {p.neighborhood} · {budgetLabel[p.budget]}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight group-hover:underline">{p.name}</h2>
                  {p.tagline && <p className="mt-2 font-serif text-lg italic text-muted">{p.tagline}</p>}
                </div>
              </Link>
            </li>
          ))}
          {places.length === 0 && <li className="text-muted">Places for this list are coming soon.</li>}
        </ol>
        {pins.length > 0 && (
          <aside className="h-[300px] lg:sticky lg:top-20 lg:h-[calc(100vh-7rem)]">
            <PlacesMap pins={pins} />
          </aside>
        )}
      </div>

      <div className="mt-16 border-t border-line pt-6">
        <ShareButtons url={`${siteUrl}/lists/${list.slug}`} title={list.title} />
      </div>
    </article>
  );
}
