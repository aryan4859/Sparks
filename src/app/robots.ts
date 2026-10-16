import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

/** /robots.txt: crawl the public site, skip the admin and utility routes. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/unsubscribe", "/confirm", "/saved"] },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
