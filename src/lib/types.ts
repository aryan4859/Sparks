export type Category = "cafe" | "restaurant" | "shop";

export type Budget = 1 | 2 | 3;

export type MenuItem = {
  name: string;
  price: number;
  description?: string;
  veg?: boolean;
};

export type MenuSection = {
  title: string;
  items: MenuItem[];
};

export type Place = {
  slug: string;
  name: string;
  category: Category;
  /** e.g. "Specialty coffee", "Newari", "Fashion", "Online store" */
  type: string;
  neighborhood: string;
  city: string;
  budget: Budget;
  ambience: string[];
  /** Keys of `features` in src/lib/site.ts (Wi-Fi, parking, …) */
  features: string[];
  tagline: string;
  /** Our take — the editorial review */
  review: string;
  cover: string;
  gallery: string[];
  /** Online-only stores have no coordinates */
  location?: { lat: number; lng: number; address: string };
  hours?: string;
  instagram?: string;
  website?: string;
  online?: boolean;
  vegetarian?: "pure-veg" | "veg-friendly";
  signature: MenuItem[];
  menu: MenuSection[];
  featured?: boolean;
  published?: boolean;
  addedAt: string;
};

/** A curated list: places in a chosen order ("Best momo in Patan"). */
export type CuratedList = {
  slug: string;
  title: string;
  intro: string;
  cover: string;
  /** Place slugs, in the order shown */
  places: string[];
  published: boolean;
  updatedAt?: string;
};

/** Optional editorial content for a neighbourhood page. */
export type Area = { slug: string; name: string; intro: string; cover: string };

export type PostBlock =
  | { type: "p"; text: string }
  | { type: "h"; text: string }
  | { type: "img"; src: string; caption?: string }
  | { type: "place"; slug: string };

export type Post = {
  slug: string;
  title: string;
  excerpt: string;
  cover: string;
  date: string;
  /** Lightweight markdown — see src/lib/markdown.ts */
  body: string;
  published?: boolean;
};
