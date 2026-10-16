import { collectFacets, listFromRow, placeFromRow, postFromRow, type ListRow, type PlaceRow, type PostRow } from "./db";
import { isOpen, parseHours } from "./hours";
import { type Feature, firstParam as first, isFeature } from "./site";
import { publicClient } from "./supabase/clients";
import { dbError } from "./supabase/errors";
import type { Area, Budget, Category, Place } from "./types";
import { slugify } from "./validate";

/**
 * Public read layer. Uses a session-less Supabase client, so RLS only ever
 * returns published rows here.
 */

export type PlaceFilters = {
  category?: Category;
  area?: string;
  type?: string;
  budget?: Budget;
  ambience?: string;
  veg?: boolean;
  q?: string;
  /** Has this attribute (a key of `features`). */
  feature?: Feature;
  /** Only places open right now (hours understood by src/lib/hours.ts). */
  open?: boolean;
  /** Sort by distance from here (the visitor's location, rounded to ~100 m). */
  near?: { lat: number; lng: number };
};

/** "27.671,85.323" → coordinates, rounded so the URL doesn't carry an exact location. */
function parseNear(v: string | undefined) {
  const m = v?.match(/^(-?\d{1,2}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)$/);
  if (!m) return undefined;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return undefined;
  return { lat: Math.round(lat * 1000) / 1000, lng: Math.round(lng * 1000) / 1000 };
}

type SearchParams = Record<string, string | string[] | undefined>;

export function parseFilters(sp: SearchParams, category?: Category): PlaceFilters {
  const budget = Number(first(sp.budget));
  const cat = first(sp.category);
  return {
    category: category ?? (cat === "cafe" || cat === "restaurant" || cat === "shop" ? cat : undefined),
    area: first(sp.area),
    type: first(sp.type),
    budget: budget === 1 || budget === 2 || budget === 3 ? budget : undefined,
    ambience: first(sp.ambience),
    veg: first(sp.veg) === "1",
    q: first(sp.q)?.trim(),
    feature: isFeature(first(sp.feature)) ? (first(sp.feature) as Feature) : undefined,
    open: first(sp.open) === "1",
    near: parseNear(first(sp.near)),
  };
}

/** Free-text match across name, type, area, tagline, ambience and signature items. */
function matchesQuery(p: Place, q: string) {
  const haystack = [p.name, p.type, p.neighborhood, p.city, p.tagline, ...p.ambience, ...p.signature.map((s) => s.name)]
    .join(" ")
    .toLowerCase();
  return q.toLowerCase().split(/\s+/).every((word) => haystack.includes(word));
}

export async function getPlaces(f: PlaceFilters = {}) {
  let query = publicClient().from("places").select("*").order("added_at", { ascending: false });
  if (f.category) query = query.eq("category", f.category);
  if (f.area) query = query.eq("neighborhood", f.area);
  if (f.type) query = query.eq("type", f.type);
  if (f.budget) query = query.eq("budget", f.budget);
  if (f.ambience) query = query.contains("ambience", [f.ambience]);
  if (f.veg) query = query.not("vegetarian", "is", null);
  if (f.feature) query = query.contains("features", [f.feature]);
  const { data, error } = await query.returns<PlaceRow[]>();
  if (error) throw dbError(error);
  let places: (Place & { km?: number })[] = data.map(placeFromRow);
  if (f.q) places = places.filter((p) => matchesQuery(p, f.q!));
  if (f.open) {
    const now = new Date();
    places = places.filter((p) => isOpen(parseHours(p.hours), now));
  }
  if (f.near) {
    const here = f.near;
    places = places
      .map((p) => ({ ...p, km: p.location ? distanceKm(here, p.location) : undefined }))
      .sort((a, b) => (a.km ?? Infinity) - (b.km ?? Infinity));
  }
  return places;
}

export async function getPlace(slug: string) {
  const { data, error } = await publicClient().from("places").select("*").eq("slug", slug).maybeSingle<PlaceRow>();
  if (error) throw dbError(error);
  return data ? placeFromRow(data) : undefined;
}

export async function getFeatured() {
  const { data, error } = await publicClient()
    .from("places")
    .select("*")
    .eq("featured", true)
    .order("added_at", { ascending: false })
    .returns<PlaceRow[]>();
  if (error) throw dbError(error);
  return data.map(placeFromRow);
}

export async function getLatest(limit = 4) {
  const { data, error } = await publicClient()
    .from("places")
    .select("*")
    .order("added_at", { ascending: false })
    .limit(limit)
    .returns<PlaceRow[]>();
  if (error) throw dbError(error);
  return data.map(placeFromRow);
}

/** Facet values available within a category, for building filter chips. */
export async function getFacets(category?: Category) {
  let query = publicClient().from("places").select("type, neighborhood, ambience, features");
  if (category) query = query.eq("category", category);
  const { data, error } = await query.returns<Pick<PlaceRow, "type" | "neighborhood" | "ambience" | "features">[]>();
  if (error) throw dbError(error);
  return collectFacets(data);
}

function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

export async function getNearby(place: Place, limit = 3) {
  const origin = place.location;
  if (!origin) return [];
  // Rough bounding box (~5 km) in SQL, exact distance in JS.
  const d = 0.05;
  const { data, error } = await publicClient()
    .from("places")
    .select("*")
    .neq("slug", place.slug)
    .gte("lat", origin.lat - d)
    .lte("lat", origin.lat + d)
    .gte("lng", origin.lng - d)
    .lte("lng", origin.lng + d)
    .returns<PlaceRow[]>();
  if (error) throw dbError(error);
  return data
    .map(placeFromRow)
    .map((p) => ({ place: p, km: distanceKm(origin, p.location!) }))
    .filter((x) => x.km < 5)
    .sort((a, b) => a.km - b.km)
    .slice(0, limit);
}

export async function getAllPlaceSlugs() {
  const { data, error } = await publicClient().from("places").select("slug").returns<{ slug: string }[]>();
  if (error) throw dbError(error);
  return data.map((r) => r.slug);
}

export async function getPosts() {
  const { data, error } = await publicClient()
    .from("posts")
    .select("*")
    .order("date", { ascending: false })
    .returns<PostRow[]>();
  if (error) throw dbError(error);
  return data.map(postFromRow);
}

export async function getPost(slug: string) {
  const { data, error } = await publicClient().from("posts").select("*").eq("slug", slug).maybeSingle<PostRow>();
  if (error) throw dbError(error);
  return data ? postFromRow(data) : undefined;
}

// ─── Curated lists ───────────────────────────────────────────────────────

export async function getLists() {
  const { data, error } = await publicClient()
    .from("lists")
    .select("*")
    .order("updated_at", { ascending: false })
    .returns<ListRow[]>();
  if (error) throw dbError(error);
  return data.map(listFromRow);
}

export async function getList(slug: string) {
  const { data, error } = await publicClient().from("lists").select("*").eq("slug", slug).maybeSingle<ListRow>();
  if (error) throw dbError(error);
  return data ? listFromRow(data) : undefined;
}

/** Published places for these slugs, in the given order (missing or unpublished ones are skipped). */
export async function getPlacesBySlugs(slugs: string[]) {
  if (!slugs.length) return [];
  const { data, error } = await publicClient().from("places").select("*").in("slug", slugs).returns<PlaceRow[]>();
  if (error) throw dbError(error);
  const bySlug = new Map(data.map((r) => [r.slug, placeFromRow(r)]));
  return slugs.flatMap((s) => bySlug.get(s) ?? []);
}

// ─── Neighbourhood guides ────────────────────────────────────────────────

/** Every neighbourhood with a published place, with its optional intro/cover and place count. */
export async function getAreas() {
  const db = publicClient();
  const [places, extra] = await Promise.all([
    db.from("places").select("neighborhood").neq("neighborhood", "").returns<{ neighborhood: string }[]>(),
    db.from("areas").select("*").returns<Area[]>(),
  ]);
  if (places.error) throw dbError(places.error);
  if (extra.error) throw dbError(extra.error);
  const info = new Map(extra.data.map((a) => [a.slug, a]));
  const areas = new Map<string, Area & { count: number }>();
  for (const { neighborhood } of places.data) {
    const slug = slugify(neighborhood);
    if (!slug) continue;
    const a = areas.get(slug) ?? { slug, name: neighborhood, intro: "", cover: "", ...info.get(slug), count: 0 };
    a.count++;
    areas.set(slug, a);
  }
  return [...areas.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/** One neighbourhood page: its published places (by category) and optional intro/cover. */
export async function getArea(slug: string) {
  const area = (await getAreas()).find((a) => a.slug === slug);
  if (!area) return undefined;
  // Published places are a hand-picked set, so match exactly in code: names that
  // slugify the same ("Patan", "patan ") belong together.
  const places = (await getPlaces()).filter((p) => slugify(p.neighborhood) === slug);
  return { ...area, places };
}
