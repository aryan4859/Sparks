import Image from "next/image";
import Link from "next/link";
import { placeFromRow, type PlaceRow, type PostRow } from "@/lib/db";
import { dismissSuggestion, eraseSubscriber } from "@/app/admin/actions";
import { DeleteButton } from "@/components/admin/ui";
import { newsletterReady } from "@/lib/newsletter";
import { categories, firstParam, formatDate } from "@/lib/site";
import { dbError } from "@/lib/supabase/errors";
import { sessionClient } from "@/lib/supabase/server";
import type { Category } from "@/lib/types";

const PAGE_SIZE = 50;

type SP = Record<string, string | string[] | undefined>;
const one = (v: SP[string]) => firstParam(v) ?? "";

/** Builds an /admin URL from the current filters with some keys changed. */
function adminHref(current: Record<string, string>, patch: Record<string, string | undefined>) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...current, ...patch })) if (v) qs.set(k, v);
  const s = qs.toString();
  return s ? `/admin?${s}` : "/admin";
}

export default async function AdminHome({ searchParams }: PageProps<"/admin">) {
  const sp = await searchParams;
  const tab = one(sp.tab);
  if (tab === "journal") return <JournalList />;
  if (tab === "subscribers") return <SubscriberList />;
  if (tab === "suggestions") return <SuggestionList />;
  return <PlacesList sp={sp} />;
}

async function PlacesList({ sp }: { sp: SP }) {
  const filters = {
    q: one(sp.q).trim(),
    status: ["published", "drafts"].includes(one(sp.status)) ? one(sp.status) : "",
    cat: ["cafe", "restaurant", "shop"].includes(one(sp.cat)) ? one(sp.cat) : "",
    city: one(sp.city),
  };
  const page = Math.max(1, Number(one(sp.page)) || 1);
  const supabase = await sessionClient();

  let query = supabase.from("places").select("*", { count: "exact" });
  if (filters.q) query = query.ilike("name", `%${filters.q.replace(/[%_,]/g, " ")}%`);
  if (filters.status) query = query.eq("published", filters.status === "published");
  if (filters.cat) query = query.eq("category", filters.cat);
  if (filters.city) query = query.eq("city", filters.city);
  const from = (page - 1) * PAGE_SIZE;
  const [res, published, cityRows] = await Promise.all([
    query
      .order("published", { ascending: false })
      .order("updated_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1)
      .returns<PlaceRow[]>(),
    supabase.from("places").select("slug", { count: "exact", head: true }).eq("published", true),
    // Cities for the filter dropdown, most common first
    supabase.from("places").select("city").neq("city", "").limit(10000).returns<{ city: string }[]>(),
  ]);
  for (const r of [res, published, cityRows]) if (r.error) throw dbError(r.error);

  const places = (res.data ?? []).map(placeFromRow);
  const total = res.count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const cityCounts: Record<string, number> = {};
  for (const r of cityRows.data ?? []) cityCounts[r.city] = (cityCounts[r.city] ?? 0) + 1;
  const cities = Object.entries(cityCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 40)
    .map(([c]) => c);
  const listHref = adminHref(filters, { page: page > 1 ? String(page) : undefined });
  const unfiltered = !filters.q && !filters.status && !filters.cat && !filters.city;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Places</h1>
          <p className="mt-1 text-sm text-muted">
            {(published.count ?? 0).toLocaleString()} published · {total.toLocaleString()} {unfiltered ? "in total" : "matching"}
          </p>
        </div>
        <Link
          href={`/admin/places/new?back=${encodeURIComponent(listHref)}`}
          className="bg-ink px-5 py-2.5 text-sm text-paper hover:opacity-85"
        >
          + New place
        </Link>
      </div>

      {/* Filters: a plain GET form, so it also works without JavaScript */}
      <form action="/admin" className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_auto_auto_auto_auto]">
        <input
          name="q"
          defaultValue={filters.q}
          placeholder="Search by name…"
          className="col-span-2 border border-line bg-field px-3 py-2 text-sm outline-none focus:border-ink sm:col-span-1"
        />
        <select name="status" defaultValue={filters.status} className="border border-line bg-field px-2 py-2 text-sm">
          <option value="">Published + drafts</option>
          <option value="published">Published</option>
          <option value="drafts">Drafts</option>
        </select>
        <select name="cat" defaultValue={filters.cat} className="border border-line bg-field px-2 py-2 text-sm">
          <option value="">All categories</option>
          <option value="cafe">Cafés</option>
          <option value="restaurant">Restaurants</option>
          <option value="shop">Shops</option>
        </select>
        <select name="city" defaultValue={filters.city} className="border border-line bg-field px-2 py-2 text-sm">
          <option value="">All cities</option>
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button className="border border-ink px-4 py-2 text-sm hover:bg-ink hover:text-paper">Filter</button>
      </form>

      {places.length === 0 ? (
        <p className="border border-dashed border-line p-6 text-sm text-muted">
          {unfiltered
            ? "No places yet. Add one with “+ New place”, or import Nepal’s cafés and restaurants as drafts with “npm run import-osm”."
            : "Nothing matches these filters."}
        </p>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {places.map((p) => (
            <li key={p.slug}>
              <Link
                href={`/admin/places/${p.slug}?back=${encodeURIComponent(listHref)}`}
                className="flex items-center gap-4 py-3 hover:bg-card/50"
              >
                <div className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden bg-card text-[10px] text-muted">
                  {p.cover ? <Image src={p.cover} alt="" fill sizes="56px" className="object-cover" /> : "No photo"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {p.name}
                    {!p.published && <span className="label ml-2 text-warn">Draft</span>}
                    {p.featured && <span className="label ml-2 text-muted">Featured</span>}
                  </p>
                  <p className="label mt-0.5 truncate text-muted">
                    {[categories[p.category].label, p.type, p.neighborhood, p.city].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <span className="hidden text-xs text-muted sm:block">Added {formatDate(p.addedAt)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {pages > 1 && (
        <nav className="flex items-center justify-between text-sm">
          {page > 1 ? (
            <Link href={adminHref(filters, { page: String(page - 1) })} className="underline">
              ← Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="text-muted">
            Page {page} of {pages.toLocaleString()}
          </span>
          {page < pages ? (
            <Link href={adminHref(filters, { page: String(page + 1) })} className="underline">
              Next →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}

async function JournalList() {
  const supabase = await sessionClient();
  const res = await supabase
    .from("posts")
    .select("slug, title, cover, date, published")
    .order("date", { ascending: false })
    .returns<PostRow[]>();
  if (res.error) throw dbError(res.error);
  const posts = res.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Journal</h1>
          <p className="mt-1 text-sm text-muted">{posts.length} stories</p>
        </div>
        <Link href="/admin/posts/new" className="bg-ink px-5 py-2.5 text-sm text-paper hover:opacity-85">
          + New story
        </Link>
      </div>
      {posts.length === 0 ? (
        <p className="border border-dashed border-line p-6 text-sm text-muted">No stories yet.</p>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {posts.map((p) => (
            <li key={p.slug}>
              <Link href={`/admin/posts/${p.slug}`} className="flex items-center gap-4 py-3 hover:bg-card/50">
                <div className="relative flex h-14 w-20 shrink-0 items-center justify-center overflow-hidden bg-card text-[10px] text-muted">
                  {p.cover ? <Image src={p.cover} alt="" fill sizes="80px" className="object-cover" /> : "No photo"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {p.title}
                    {!p.published && <span className="label ml-2 text-warn">Draft</span>}
                  </p>
                  <p className="text-xs text-muted">{formatDate(p.date)}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

async function SubscriberList() {
  const supabase = await sessionClient();
  const [res, active] = await Promise.all([
    supabase
      .from("subscribers")
      .select("email, created_at, unsubscribed_at, confirmed_at")
      .order("created_at", { ascending: false })
      .limit(500)
      .returns<{ email: string; created_at: string; unsubscribed_at: string | null; confirmed_at: string | null }[]>(),
    supabase
      .from("subscribers")
      .select("email", { count: "exact", head: true })
      .is("unsubscribed_at", null)
      .not("confirmed_at", "is", null),
  ]);
  if (res.error) throw dbError(res.error);
  if (active.error) throw dbError(active.error);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Subscribers</h1>
        <p className="mt-1 text-sm text-muted">
          {(active.count ?? 0).toLocaleString()} confirmed subscribers · new places and stories are emailed to them when you tick “Email to N subscribers”. Unconfirmed sign-ups are removed after 30 days
          {!newsletterReady && " (not set up yet: add the GMAIL_* settings, NEWSLETTER_FROM and NEXT_PUBLIC_SITE_URL)"}
        </p>
      </div>
      {res.data.length === 0 ? (
        <p className="border border-dashed border-line p-6 text-sm text-muted">
          No subscribers yet. Visitors sign up with the form in the site footer.
        </p>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {res.data.map((s) => (
            <li key={s.email} className="flex items-center justify-between gap-4 py-3 text-sm">
              <span className={`truncate ${s.unsubscribed_at ? "text-muted line-through" : ""}`}>{s.email}</span>
              <span className="flex shrink-0 items-center gap-4 text-xs text-muted">
                {s.unsubscribed_at
                  ? `Left ${formatDate(s.unsubscribed_at)}`
                  : s.confirmed_at
                    ? `Joined ${formatDate(s.created_at)}`
                    : `Waiting for confirmation since ${formatDate(s.created_at)}`}
                <DeleteButton
                  confirmText={`Permanently erase ${s.email}? Use this when someone asks for their data to be deleted.`}
                  action={eraseSubscriber.bind(null, s.email)}
                  label="Erase"
                  pendingLabel="Erasing…"
                />
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type Suggestion = { id: string; name: string; category: Category; area: string; maps_link: string; note: string; created_at: string };

async function SuggestionList() {
  const supabase = await sessionClient();
  const res = await supabase
    .from("suggestions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200)
    .returns<Suggestion[]>();
  if (res.error) throw dbError(res.error);

  // Bare coordinates become a Google Maps search link.
  const mapHref = (link: string) =>
    /^https?:/i.test(link) ? link : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(link)}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Suggestions</h1>
        <p className="mt-1 text-sm text-muted">
          Places visitors recommended at <Link href="/suggest" target="_blank" className="underline">/suggest</Link>.
          “Create draft” opens a new place with the details filled in; the suggestion clears once you save it.
        </p>
      </div>
      {res.data.length === 0 ? (
        <p className="border border-dashed border-line p-6 text-sm text-muted">No suggestions right now.</p>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {res.data.map((s) => (
            <li key={s.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 space-y-1">
                <p className="font-medium">{s.name}</p>
                <p className="label text-muted">
                  {[categories[s.category]?.label, s.area, `Suggested ${formatDate(s.created_at)}`].filter(Boolean).join(" · ")}
                </p>
                {s.note && <p className="whitespace-pre-line text-sm">{s.note}</p>}
                {s.maps_link && (
                  <a href={mapHref(s.maps_link)} target="_blank" rel="noreferrer" className="inline-block text-sm text-muted underline hover:text-ink">
                    Open map ↗
                  </a>
                )}
              </div>
              <div className="flex shrink-0 items-start gap-4">
                <Link href={`/admin/places/new?suggestion=${s.id}`} className="bg-ink px-4 py-2 text-sm text-paper hover:opacity-85">
                  Create draft →
                </Link>
                <DeleteButton
                  confirmText={`Dismiss the suggestion “${s.name}”?`}
                  action={dismissSuggestion.bind(null, s.id)}
                  label="Dismiss"
                  pendingLabel="Dismissing…"
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
