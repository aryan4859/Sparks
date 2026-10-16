import { collectFacets, placeFromRow, postFromRow, type PlaceRow, type PostRow } from "./db";
import { firstParam as first } from "./site";
import { publicClient } from "./supabase/clients";
import { dbError } from "./supabase/errors";
import type { Budget, Category, Place } from "./types";

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
};

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
  const { data, error } = await query.returns<PlaceRow[]>();
  if (error) throw dbError(error);
  const places = data.map(placeFromRow);
  return f.q ? places.filter((p) => matchesQuery(p, f.q!)) : places;
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
  let query = publicClient().from("places").select("type, neighborhood, ambience");
  if (category) query = query.eq("category", category);
  const { data, error } = await query.returns<Pick<PlaceRow, "type" | "neighborhood" | "ambience">[]>();
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
