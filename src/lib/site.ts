import type { Budget, Category } from "./types";

export const site = {
  name: "Sparks",
  tagline: "A curated guide to Nepal's cafés, kitchens and shops",
  instagram: "https://instagram.com/",
  email: "sparksby.shabnam@gmail.com",
};

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
