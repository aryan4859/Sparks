import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PlacesMap, type MapPin } from "@/components/map/PlacesMap";
import { PlaceGrid } from "@/components/PlaceCard";
import { ShareButtons } from "@/components/ShareButtons";
import { getArea, getAreas } from "@/lib/queries";
import { categories, siteUrl } from "@/lib/site";
import type { Category } from "@/lib/types";

export async function generateStaticParams() {
  return (await getAreas()).map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: PageProps<"/areas/[slug]">): Promise<Metadata> {
  const area = await getArea((await params).slug);
  if (!area) return {};
  const description = area.intro || `Cafés, restaurants and shops in ${area.name}, handpicked by Sparks.`;
  return {
    title: `${area.name} guide`,
    description,
    alternates: { canonical: `/areas/${area.slug}` },
    openGraph: { title: `${area.name} guide`, description, url: `/areas/${area.slug}`, images: area.cover ? [area.cover] : [] },
  };
}

export default async function AreaPage({ params }: PageProps<"/areas/[slug]">) {
  const area = await getArea((await params).slug);
  if (!area) notFound();
  const pins: MapPin[] = area.places.flatMap((p) =>
    p.location ? [{ slug: p.slug, name: p.name, label: categories[p.category].label, hours: p.hours, ...p.location }] : [],
  );
  const groups = (Object.keys(categories) as Category[])
    .map((c) => ({ category: c, places: area.places.filter((p) => p.category === c) }))
    .filter((g) => g.places.length);

  return (
    <article>
      <header className="mx-auto max-w-7xl px-4 pt-14 sm:px-6 sm:pt-20">
        <p className="label text-muted">Neighbourhood guide</p>
        <h1 className="mt-4 text-5xl font-semibold tracking-tight sm:text-7xl">{area.name}</h1>
        {area.intro && <p className="mt-6 max-w-3xl whitespace-pre-line text-lg leading-relaxed text-muted">{area.intro}</p>}
      </header>
      {area.cover && (
        <div className="mx-auto mt-10 max-w-7xl sm:px-6">
          <div className="relative aspect-[21/9] bg-card">
            <Image src={area.cover} alt={area.name} fill priority sizes="100vw" className="object-cover" />
          </div>
        </div>
      )}
      <div className="mx-auto mt-12 grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_minmax(0,0.8fr)]">
        <div className="space-y-16">
          {groups.map(({ category, places }) => (
            <section key={category}>
              <h2 className="border-b border-line pb-3 text-2xl font-semibold tracking-tight">
                {categories[category].plural} <span className="text-base font-normal text-muted">{places.length}</span>
              </h2>
              <div className="mt-6">
                <PlaceGrid places={places} cols={2} />
              </div>
            </section>
          ))}
        </div>
        {pins.length > 0 && (
          <aside className="order-first h-[260px] lg:order-none lg:sticky lg:top-20 lg:h-[calc(100vh-7rem)]">
            <PlacesMap pins={pins} />
          </aside>
        )}
      </div>
      <div className="mx-auto mt-16 flex max-w-7xl flex-wrap items-center justify-between gap-6 border-t border-line px-4 pt-6 sm:px-6">
        <Link href="/explore" className="label text-muted hover:text-ink">← Explore the map</Link>
        <ShareButtons url={`${siteUrl}/areas/${area.slug}`} title={`${area.name} — a Sparks guide`} />
      </div>
    </article>
  );
}
