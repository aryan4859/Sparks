import Link from "next/link";
import { budgetHint, budgetLabel } from "@/lib/site";
import type { PlaceFilters } from "@/lib/queries";
import type { Budget } from "@/lib/types";

type Facets = { areas: string[]; types: string[]; ambience: string[] };

type Params = Partial<Record<"q" | "area" | "type" | "budget" | "ambience" | "veg" | "category", string>>;

function toParams(f: PlaceFilters, includeCategory: boolean): Params {
  return {
    q: f.q,
    area: f.area,
    type: f.type,
    budget: f.budget?.toString(),
    ambience: f.ambience,
    veg: f.veg ? "1" : undefined,
    category: includeCategory ? f.category : undefined,
  };
}

function href(base: string, params: Params) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) qs.set(k, v);
  const s = qs.toString();
  return s ? `${base}?${s}` : base;
}

function Chip({ active, href, children, title }: { active: boolean; href: string; children: React.ReactNode; title?: string }) {
  return (
    <Link
      href={href}
      scroll={false}
      title={title}
      className={`whitespace-nowrap rounded-full border px-3 py-1 text-xs transition ${
        active ? "border-ink bg-ink text-paper" : "border-line text-muted hover:border-ink hover:text-ink"
      }`}
    >
      {children}
    </Link>
  );
}

/**
 * Filter chips rendered entirely on the server — each chip is a link that
 * toggles one query parameter, so filtering works without client JavaScript.
 */
export function Filters({
  base,
  filters,
  facets,
  showCategory = false,
  showVeg = false,
}: {
  base: string;
  filters: PlaceFilters;
  facets: Facets;
  showCategory?: boolean;
  showVeg?: boolean;
}) {
  const current = toParams(filters, showCategory);
  const toggle = (key: keyof Params, value: string) =>
    href(base, { ...current, [key]: current[key] === value ? undefined : value });

  const rows: { label: string; key: keyof Params; options: { value: string; text: string; title?: string }[] }[] = [];
  if (showCategory) {
    rows.push({
      label: "Category",
      key: "category",
      options: [
        { value: "cafe", text: "Cafés" },
        { value: "restaurant", text: "Restaurants" },
        { value: "shop", text: "Shops" },
      ],
    });
  }
  if (facets.types.length > 1) {
    rows.push({ label: "Type", key: "type", options: facets.types.map((t) => ({ value: t, text: t })) });
  }
  rows.push(
    { label: "Area", key: "area", options: facets.areas.map((a) => ({ value: a, text: a })) },
    {
      label: "Budget",
      key: "budget",
      options: ([1, 2, 3] as Budget[]).map((b) => ({ value: String(b), text: budgetLabel[b], title: budgetHint[b] })),
    },
    { label: "Ambience", key: "ambience", options: facets.ambience.map((a) => ({ value: a, text: a })) },
  );

  const hasAny = Object.entries(current).some(([k, v]) => v && !(k === "category" && !showCategory));

  return (
    <div className="space-y-4">
      <form action={base} className="flex items-center border-b border-ink">
        {Object.entries(current).map(([k, v]) => (k !== "q" && v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
        <input
          name="q"
          defaultValue={filters.q}
          placeholder="Search places, dishes, drinks"
          className="w-full min-w-0 bg-transparent py-3 text-base outline-none placeholder:text-muted sm:text-lg"
        />
        <button className="label shrink-0 pl-3">Search →</button>
      </form>
      <div className="space-y-2.5">
        {rows.map((row) => (
          <div key={row.key} className="flex items-center gap-3">
            <span className="label w-20 shrink-0 text-muted">{row.label}</span>
            <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
              {row.options.map((o) => (
                <Chip key={o.value} active={current[row.key] === o.value} href={toggle(row.key, o.value)} title={o.title}>
                  {o.text}
                </Chip>
              ))}
              {showVeg && row.key === "budget" && (
                <Chip active={!!filters.veg} href={toggle("veg", "1")}>Vegetarian-friendly</Chip>
              )}
            </div>
          </div>
        ))}
      </div>
      {hasAny && (
        <Link href={base} scroll={false} className="inline-block text-xs text-muted underline hover:text-ink">
          Clear all filters
        </Link>
      )}
    </div>
  );
}
