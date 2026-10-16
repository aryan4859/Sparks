import Link from "next/link";
import { Filters } from "@/components/Filters";
import { PlacesMap, type MapPin } from "@/components/map/PlacesMap";
import { PlaceGrid } from "@/components/PlaceCard";
import { categories } from "@/lib/site";
import { getFacets, getPlaces, parseFilters } from "@/lib/queries";
import type { Category } from "@/lib/types";

type SearchParams = Record<string, string | string[] | undefined>;

export async function Directory({
  base,
  title,
  intro,
  category,
  searchParams,
}: {
  base: string;
  title: React.ReactNode;
  intro: string;
  category?: Category;
  searchParams: SearchParams;
}) {
  const filters = parseFilters(searchParams, category);
  const [results, facets] = await Promise.all([getPlaces(filters), getFacets(category)]);

  const pins: MapPin[] = results.flatMap((p) =>
    p.location
      ? [{ slug: p.slug, name: p.name, label: `${categories[p.category].label} · ${p.type}`, ...p.location }]
      : [],
  );

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      <header className="max-w-2xl pb-10 pt-14 sm:pt-20">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">{title}</h1>
        <p className="mt-4 text-muted sm:text-lg">{intro}</p>
      </header>

      <Filters
        base={base}
        filters={filters}
        facets={facets}
        showCategory={!category}
        showVeg={category !== "shop"}
      />

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_minmax(0,0.85fr)]">
        <section>
          <p className="label mb-6 text-muted">
            {results.length} {results.length === 1 ? "place" : "places"}
            {filters.open && " open now"}
            {filters.near && " · nearest first"}
          </p>
          {results.length > 0 ? (
            <PlaceGrid places={results} cols={2} />
          ) : (
            <p className="py-20 text-center text-muted">Nothing matches yet — try removing a filter.</p>
          )}
          <p className="mt-12 border-t border-line pt-6 text-sm text-muted">
            Know a place we&apos;re missing?{" "}
            <Link href="/suggest" className="text-ink underline hover:text-muted">Suggest it →</Link>
          </p>
        </section>
        <aside className="order-first h-[240px] sm:h-[340px] lg:order-none lg:sticky lg:top-20 lg:h-[calc(100vh-7rem)]">
          <PlacesMap pins={pins} />
        </aside>
      </div>
    </div>
  );
}
