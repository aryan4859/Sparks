import type { MetadataRoute } from "next";
import { categories, siteUrl } from "@/lib/site";
import { publicClient } from "@/lib/supabase/clients";
import { getAreas } from "@/lib/queries";
import { dbError } from "@/lib/supabase/errors";

/** /sitemap.xml: every public page, so search engines find new places and stories. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const db = publicClient(); // RLS: published rows only
  const [places, posts, lists, areas] = await Promise.all([
    db.from("places").select("slug, updated_at").returns<{ slug: string; updated_at: string }[]>(),
    db.from("posts").select("slug, updated_at").returns<{ slug: string; updated_at: string }[]>(),
    db.from("lists").select("slug, updated_at").returns<{ slug: string; updated_at: string }[]>(),
    getAreas(),
  ]);
  if (places.error) throw dbError(places.error);
  if (posts.error) throw dbError(posts.error);
  if (lists.error) throw dbError(lists.error);

  const page = (path: string, lastModified?: string): MetadataRoute.Sitemap[number] => ({
    url: `${siteUrl}${path}`,
    ...(lastModified ? { lastModified } : {}),
  });
  return [
    page("/"),
    ...Object.values(categories).map((c) => page(c.href)),
    page("/explore"),
    page("/journal"),
    ...places.data.map((p) => page(`/places/${p.slug}`, p.updated_at)),
    ...posts.data.map((p) => page(`/journal/${p.slug}`, p.updated_at)),
    page("/lists"),
    ...lists.data.map((l) => page(`/lists/${l.slug}`, l.updated_at)),
    ...areas.map((a) => page(`/areas/${a.slug}`)),
    page("/privacy"),
    page("/terms"),
  ];
}
