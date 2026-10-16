import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { JsonLd, placeJsonLd } from "@/components/JsonLd";
import { OpenStatus } from "@/components/OpenStatus";
import { slugify } from "@/lib/validate";
import { ShareButtons } from "@/components/ShareButtons";
import { notFound } from "next/navigation";
import { PlacesMap } from "@/components/map/PlacesMap";
import { PlaceCard } from "@/components/PlaceCard";
import { budgetHint, budgetLabel, categories, directionsUrl, features, formatPrice, isFeature, siteUrl } from "@/lib/site";
import { getAllPlaceSlugs, getNearby, getPlace } from "@/lib/queries";

export async function generateStaticParams() {
  return (await getAllPlaceSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/places/[slug]">): Promise<Metadata> {
  const place = await getPlace((await params).slug);
  if (!place) return {};
  const title = place.neighborhood ? `${place.name}, ${place.neighborhood}` : place.name;
  return {
    title,
    description: place.tagline || undefined,
    alternates: { canonical: `/places/${place.slug}` },
    openGraph: { title, description: place.tagline || undefined, url: `/places/${place.slug}`, images: place.cover ? [place.cover] : [] },
  };
}

export default async function PlacePage({ params }: PageProps<"/places/[slug]">) {
  const place = await getPlace((await params).slug);
  if (!place) notFound();

  const nearby = await getNearby(place);
  const cat = categories[place.category];
  const signatureTitle =
    place.category === "cafe" ? "Signature drinks" : place.category === "restaurant" ? "Signature dishes" : "What to buy";

  return (
    <article>
      <JsonLd data={placeJsonLd(place)} />
      {/* Hero */}
      <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 sm:pt-14">
        <nav className="label text-muted">
          <Link href={cat.href} className="hover:text-ink">{cat.plural}</Link>
          <span className="mx-2">/</span>
          {place.neighborhood && slugify(place.neighborhood) ? (
            <Link href={`/areas/${slugify(place.neighborhood)}`} className="hover:text-ink">{place.neighborhood}</Link>
          ) : (
            <span>{place.neighborhood}</span>
          )}
        </nav>
        <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight sm:text-7xl">{place.name}</h1>
        <p className="mt-4 max-w-2xl font-serif text-2xl italic text-muted sm:text-3xl">{place.tagline}</p>
      </div>

      {/* Phones: swipeable strip of every photo */}
      <div className="mt-8 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:hidden">
        {(place.gallery.length ? place.gallery : [place.cover]).map((src, i) => (
          <div key={src + i} className="relative aspect-[4/3] w-[85%] shrink-0 snap-center bg-card">
            <Image src={src} alt={`${place.name} photo ${i + 1}`} fill loading={i === 0 ? "eager" : "lazy"} sizes="85vw" className="object-cover" />
          </div>
        ))}
      </div>
      {/* Larger screens: one large photo and two small */}
      <div className="mx-auto mt-10 hidden max-w-7xl gap-2 px-6 sm:grid sm:grid-cols-[2fr_1fr]">
        <div className="relative bg-card sm:row-span-2">
          <Image src={place.gallery[0] ?? place.cover} alt={place.name} fill priority sizes="66vw" className="object-cover" />
        </div>
        {place.gallery.slice(1, 3).map((src, i) => (
          <div key={src} className="relative aspect-[4/3] bg-card">
            <Image src={src} alt={`${place.name} photo ${i + 2}`} fill sizes="33vw" className="object-cover" />
          </div>
        ))}
      </div>

      {/* Phones: the essentials up front, before the review and menu */}
      <div className="mx-4 mt-6 flex items-center justify-between gap-4 border-y border-line py-3 text-sm lg:hidden">
        <div className="min-w-0">
          <p className="truncate">{place.location?.address ?? "Online only — delivers nationwide"}</p>
          {place.hours && (
            <p className="truncate text-muted">
              <OpenStatus hours={place.hours} compact />
            </p>
          )}
        </div>
        {place.location ? (
          <a
            href={directionsUrl(place.location.lat, place.location.lng)}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 bg-ink px-4 py-2.5 text-paper"
          >
            Directions ↗
          </a>
        ) : (
          place.website && (
            <a href={place.website} target="_blank" rel="noreferrer" className="shrink-0 bg-ink px-4 py-2.5 text-paper">
              Visit store ↗
            </a>
          )
        )}
      </div>

      {/* Body */}
      <div className="mx-auto mt-14 grid max-w-7xl gap-14 px-4 sm:px-6 lg:grid-cols-[1fr_340px]">
        <div className="max-w-2xl">
          <p className="label text-muted">Our take</p>
          <p className="mt-4 text-lg leading-relaxed sm:text-xl">{place.review}</p>

          {place.features.length > 0 && (
            <ul className="mt-8 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
              {place.features.filter(isFeature).map((f) => (
                <li key={f}>
                  <Link href={`${cat.href}?feature=${f}`} className="hover:underline">
                    <span aria-hidden className="mr-1.5 text-muted">✓</span>
                    {features[f]}
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {place.ambience.length > 0 && (
            <div className="mt-8 flex flex-wrap gap-1.5">
              {place.ambience.map((a) => (
                <Link
                  key={a}
                  href={`/explore?ambience=${encodeURIComponent(a)}`}
                  className="rounded-full border border-line px-3 py-1 text-xs text-muted hover:border-ink hover:text-ink"
                >
                  {a}
                </Link>
              ))}
            </div>
          )}

          {place.signature.length > 0 && (
            <section className="mt-14">
              <h2 className="label text-muted">{signatureTitle}</h2>
              <ul className="mt-4 divide-y divide-line border-y border-line">
                {place.signature.map((item) => (
                  <li key={item.name} className="flex items-baseline justify-between gap-6 py-4">
                    <div>
                      <p className="text-lg font-medium">{item.name}</p>
                      {item.description && <p className="mt-1 text-sm text-muted">{item.description}</p>}
                    </div>
                    <span className="shrink-0 text-sm tabular-nums">{formatPrice(item.price)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {place.menu.length > 0 && (
            <section className="mt-14">
              <h2 className="label text-muted">Menu</h2>
              <div className="mt-4 grid gap-10 sm:grid-cols-2">
                {place.menu.map((section) => (
                  <div key={section.title}>
                    <h3 className="font-serif text-2xl italic">{section.title}</h3>
                    <ul className="mt-3 space-y-2 text-sm">
                      {section.items.map((item) => (
                        <li key={item.name} className="flex items-baseline gap-2">
                          <span>
                            {item.name}
                            {item.veg && <span className="ml-1.5 text-[10px] text-veg" title="Vegetarian">●</span>}
                          </span>
                          <span className="flex-1 border-b border-dotted border-line" />
                          <span className="tabular-nums text-muted">{formatPrice(item.price)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <p className="mt-6 text-xs text-muted">Prices last checked when this listing was updated and may change.</p>
            </section>
          )}
        </div>

        {/* Info sidebar */}
        <aside className="space-y-8 lg:sticky lg:top-20 lg:self-start">
          {place.location && (
            <div className="aspect-square bg-card">
              <PlacesMap
                pins={[{ slug: place.slug, name: place.name, label: place.type, ...place.location }]}
              />
            </div>
          )}
          <dl className="divide-y divide-line border-y border-line text-sm">
            <Row label="Type">{place.type}</Row>
            <Row label="Budget">
              {budgetLabel[place.budget]} <span className="text-muted">· {budgetHint[place.budget]}</span>
            </Row>
            {place.vegetarian && (
              <Row label="Diet">{place.vegetarian === "pure-veg" ? "Pure vegetarian" : "Vegetarian-friendly"}</Row>
            )}
            {place.hours && (
              <Row label="Hours">
                <OpenStatus hours={place.hours} />
              </Row>
            )}
            <Row label="Address">{place.location?.address ?? "Online only — delivers nationwide"}</Row>
          </dl>
          <div className="flex flex-col gap-2">
            {place.location && (
              <a
                href={directionsUrl(place.location.lat, place.location.lng)}
                target="_blank"
                rel="noreferrer"
                className="bg-ink px-5 py-3 text-center text-sm text-paper transition hover:opacity-85"
              >
                Get directions ↗
              </a>
            )}
            {place.website && (
              <a href={place.website} target="_blank" rel="noreferrer" className="border border-ink px-5 py-3 text-center text-sm hover:bg-ink hover:text-paper">
                Visit store ↗
              </a>
            )}
            {place.instagram && (
              <a href={place.instagram} target="_blank" rel="noreferrer" className="border border-line px-5 py-3 text-center text-sm hover:border-ink">
                Instagram ↗
              </a>
            )}
          </div>
          <div className="mt-6">
            <ShareButtons url={`${siteUrl}/places/${place.slug}`} title={place.name} />
          </div>
        </aside>
      </div>

      {nearby.length > 0 && (
        <section className="mx-auto mt-24 max-w-7xl px-4 sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight">
            Nearby <span className="font-serif font-normal italic">while you&rsquo;re there</span>
          </h2>
          <div className="mt-8 grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 sm:gap-x-5 sm:gap-y-10">
            {nearby.map(({ place: p, km }) => (
              <div key={p.slug}>
                <PlaceCard place={p} />
                <p className="mt-1 text-xs text-muted">{km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`} away</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4 py-3">
      <dt className="label w-20 shrink-0 pt-0.5 text-muted">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
