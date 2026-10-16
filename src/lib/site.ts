import type { Budget, Category } from "./types";

export const site = {
  name: "Sparks",
  tagline: "A curated guide to Nepal's cafés, kitchens and shops",
  /** Your Instagram profile URL; the footer link is hidden while this is empty. */
  instagram: "",
  email: "sparksby.shabnam@gmail.com",
};

/**
 * The public address of the site, for links in emails, the sitemap and social
 * previews. Set NEXT_PUBLIC_SITE_URL in production; on Vercel it falls back to
 * the project's production domain.
 */
export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000")
).replace(/\/+$/, "");

if (typeof window === "undefined" && process.env.NODE_ENV === "production" && siteUrl.includes("localhost")) {
  console.warn("NEXT_PUBLIC_SITE_URL isn't set: email links, the sitemap and share previews will point to localhost.");
}

export const categories: Record<Category, { label: string; plural: string; href: string }> = {
  cafe: { label: "Café", plural: "Cafés", href: "/cafes" },
  restaurant: { label: "Restaurant", plural: "Restaurants", href: "/restaurants" },
  shop: { label: "Shop", plural: "Shops", href: "/shops" },
};

export const budgetLabel: Record<Budget, string> = {
  1: "Rs",
  2: "Rs Rs",
  3: "Rs Rs Rs",
};

export const budgetHint: Record<Budget, string> = {
  1: "Under Rs 500",
  2: "Rs 500–1,500",
  3: "Rs 1,500+",
};

export function formatPrice(npr: number) {
  return `Rs ${npr.toLocaleString("en-IN")}`;
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function directionsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

/** First value of a search param (Next gives string | string[] | undefined). */
export function firstParam(v: string | string[] | undefined) {
  return (Array.isArray(v) ? v[0] : v) || undefined;
}

/** Only allow returning to an admin page on this site (blocks open redirects like //evil.com). */
export function safeAdminPath(path: unknown, fallback = "/admin") {
  return typeof path === "string" && (path === "/admin" || path.startsWith("/admin/") || path.startsWith("/admin?"))
    ? path
    : fallback;
}
