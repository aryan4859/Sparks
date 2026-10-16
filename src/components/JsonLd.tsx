import { budgetHint, categories, features, isFeature, site, siteUrl } from "@/lib/site";
import type { Place, Post, Review } from "@/lib/types";

/**
 * Structured data (schema.org JSON-LD) so search engines can show rich results:
 * address, map pin, price range and hours for places; headline and date for stories.
 */
export function JsonLd({ data }: { data: object }) {
  // "<" is escaped so text from the database can never close the script tag.
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

const schemaType = { cafe: "CafeOrCoffeeShop", restaurant: "Restaurant", shop: "Store" } as const;

// schema.org accepts hours like "Mo-Fr 08:00-18:00; Sa 09:00-14:00" — only pass ones in that shape.
const SIMPLE_HOURS = /^([A-Z][a-z](-[A-Z][a-z])?(,[A-Z][a-z](-[A-Z][a-z])?)* \d{2}:\d{2}-\d{2}:\d{2})(;\s*[A-Z][a-z](-[A-Z][a-z])?(,[A-Z][a-z](-[A-Z][a-z])?)* \d{2}:\d{2}-\d{2}:\d{2})*$/;

export function placeJsonLd(place: Place, reviews: Review[] = []) {
  const loc = place.location;
  const sameAs = [place.instagram, place.website].filter(Boolean);
  return {
    "@context": "https://schema.org",
    "@type": schemaType[place.category],
    name: place.name,
    description: place.tagline || undefined,
    url: `${siteUrl}/places/${place.slug}`,
    image: [place.cover, ...place.gallery].filter(Boolean),
    priceRange: budgetHint[place.budget],
    ...(place.category !== "shop" && place.type && place.type !== categories[place.category].label
      ? { servesCuisine: place.type }
      : {}),
    ...(loc && !place.online
      ? {
          address: {
            "@type": "PostalAddress",
            streetAddress: loc.address || undefined,
            addressLocality: place.neighborhood || place.city || undefined,
            addressRegion: place.city || undefined,
            addressCountry: "NP",
          },
          geo: { "@type": "GeoCoordinates", latitude: loc.lat, longitude: loc.lng },
        }
      : {}),
    ...(place.hours && SIMPLE_HOURS.test(place.hours.trim()) ? { openingHours: place.hours.trim() } : {}),
    ...(sameAs.length ? { sameAs } : {}),
    // Approved visitor reviews: the star rating Google can show in results.
    ...(reviews.length
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: Number((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)),
            reviewCount: reviews.length,
            bestRating: 5,
            worstRating: 1,
          },
          review: reviews.slice(0, 5).map((r) => ({
            "@type": "Review",
            reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5 },
            author: { "@type": "Person", name: r.name || "A visitor" },
            datePublished: r.createdAt.slice(0, 10),
            ...(r.body ? { reviewBody: r.body } : {}),
          })),
        }
      : {}),
    ...(place.features.length
      ? {
          amenityFeature: place.features.filter(isFeature).map((f) => ({
            "@type": "LocationFeatureSpecification",
            name: features[f],
            value: true,
          })),
        }
      : {}),
  };
}

export function postJsonLd(post: Post) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt || undefined,
    image: post.cover ? [post.cover] : undefined,
    datePublished: post.date,
    url: `${siteUrl}/journal/${post.slug}`,
    author: { "@type": "Organization", name: site.name, url: siteUrl },
    publisher: { "@type": "Organization", name: site.name, url: siteUrl },
  };
}
