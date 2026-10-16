import type { Budget, Category, CuratedList, MenuItem, MenuSection, Place, Post } from "./types";

/** Row shapes as stored in Supabase (see supabase/schema.sql). */
export type PlaceRow = {
  slug: string;
  name: string;
  category: Category;
  type: string;
  neighborhood: string;
  city: string;
  budget: number;
  ambience: string[];
  features: string[];
  tagline: string;
  review: string;
  cover: string;
  gallery: string[];
  lat: number | null;
  lng: number | null;
  address: string | null;
  hours: string | null;
  instagram: string | null;
  website: string | null;
  online: boolean;
  vegetarian: "pure-veg" | "veg-friendly" | null;
  signature: MenuItem[];
  menu: MenuSection[];
  featured: boolean;
  published: boolean;
  added_at: string;
};

export type PostRow = {
  slug: string;
  title: string;
  excerpt: string;
  cover: string;
  date: string;
  body: string;
  published: boolean;
};

export function placeFromRow(r: PlaceRow): Place {
  return {
    slug: r.slug,
    name: r.name,
    category: r.category,
    type: r.type,
    neighborhood: r.neighborhood,
    city: r.city,
    budget: (r.budget >= 1 && r.budget <= 3 ? r.budget : 2) as Budget,
    ambience: r.ambience ?? [],
    features: r.features ?? [],
    tagline: r.tagline,
    review: r.review,
    cover: r.cover,
    gallery: r.gallery ?? [],
    location:
      r.lat != null && r.lng != null ? { lat: r.lat, lng: r.lng, address: r.address ?? "" } : undefined,
    hours: r.hours ?? undefined,
    instagram: r.instagram ?? undefined,
    website: r.website ?? undefined,
    online: r.online,
    vegetarian: r.vegetarian ?? undefined,
    signature: r.signature ?? [],
    menu: r.menu ?? [],
    featured: r.featured,
    published: r.published,
    addedAt: r.added_at,
  };
}

export function placeToRow(p: Place): PlaceRow {
  return {
    slug: p.slug,
    name: p.name,
    category: p.category,
    type: p.type,
    neighborhood: p.neighborhood,
    city: p.city,
    budget: p.budget,
    ambience: p.ambience,
    features: p.features ?? [],
    tagline: p.tagline,
    review: p.review,
    cover: p.cover,
    gallery: p.gallery,
    lat: p.location?.lat ?? null,
    lng: p.location?.lng ?? null,
    address: p.location?.address ?? null,
    hours: p.hours || null,
    instagram: p.instagram || null,
    website: p.website || null,
    online: !!p.online,
    vegetarian: p.vegetarian ?? null,
    signature: p.signature,
    menu: p.menu,
    featured: !!p.featured,
    published: p.published ?? true,
    added_at: p.addedAt,
  };
}

export function postFromRow(r: PostRow): Post {
  return { ...r };
}

export type ListRow = {
  slug: string;
  title: string;
  intro: string;
  cover: string;
  places: string[];
  published: boolean;
  updated_at?: string;
};

export function listFromRow(r: ListRow): CuratedList {
  return { slug: r.slug, title: r.title, intro: r.intro, cover: r.cover, places: r.places ?? [], published: r.published, updatedAt: r.updated_at };
}

export const emptyList = (): CuratedList => ({ slug: "", title: "", intro: "", cover: "", places: [], published: false });

/** Blank place and story for the admin "new" forms. */
export const emptyPlace = (): Place => ({
  slug: "",
  name: "",
  category: "cafe",
  type: "",
  neighborhood: "",
  city: "Kathmandu",
  budget: 2,
  ambience: [],
  features: [],
  tagline: "",
  review: "",
  cover: "",
  gallery: [],
  signature: [],
  menu: [],
  featured: false,
  published: true,
  addedAt: new Date().toISOString().slice(0, 10),
});

export const emptyPost = (): Post => ({
  slug: "",
  title: "",
  excerpt: "",
  cover: "",
  date: new Date().toISOString().slice(0, 10),
  body: "",
  published: true,
});

/** Distinct, sorted filter values (types, areas, ambience) from a set of place rows. */
export function collectFacets(rows: (Pick<PlaceRow, "type" | "neighborhood" | "ambience"> & { features?: string[] | null })[]) {
  const uniq = (xs: string[]) => [...new Set(xs.filter(Boolean))].sort();
  return {
    types: uniq(rows.map((r) => r.type)),
    areas: uniq(rows.map((r) => r.neighborhood)),
    ambience: uniq(rows.flatMap((r) => r.ambience ?? [])),
    features: uniq(rows.flatMap((r) => r.features ?? [])),
  };
}
