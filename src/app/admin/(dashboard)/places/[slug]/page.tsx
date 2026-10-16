import { dbError } from "@/lib/supabase/errors";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PlaceForm } from "@/components/admin/PlaceForm";
import { collectFacets, emptyPlace, placeFromRow, type PlaceRow } from "@/lib/db";
import { newsletterStatus, type NotifyColumns } from "@/lib/newsletter";
import { firstParam, safeAdminPath } from "@/lib/site";
import type { Place } from "@/lib/types";
import { coordsFromMapsLink, slugify } from "@/lib/validate";
import { sessionClient } from "@/lib/supabase/server";

export default async function EditPlacePage({ params, searchParams }: PageProps<"/admin/places/[slug]">) {
  const { slug } = await params;
  const back = safeAdminPath((await searchParams).back);
  const isNew = slug === "new";
  const supabase = await sessionClient();

  const [placeRes, facetRes] = await Promise.all([
    isNew ? null : supabase.from("places").select("*").eq("slug", slug).maybeSingle<PlaceRow & NotifyColumns>(),
    supabase.from("places").select("type, neighborhood, ambience").returns<Pick<PlaceRow, "type" | "neighborhood" | "ambience">[]>(),
  ]);
  if (placeRes?.error) throw dbError(placeRes.error);
  if (!isNew && !placeRes?.data) notFound();

  if (facetRes.error) throw dbError(facetRes.error);
  const suggestions = collectFacets(facetRes.data);
  let place = placeRes?.data ? placeFromRow(placeRes.data) : emptyPlace();

  // "Create draft" from a visitor suggestion: start the new place from its details.
  const suggestionId = isNew ? firstParam((await searchParams).suggestion) : undefined;
  let suggestion: { id: string; name: string; category: Place["category"]; area: string; maps_link: string; note: string } | null = null;
  if (suggestionId && /^[0-9a-f-]{36}$/i.test(suggestionId)) {
    const res = await supabase.from("suggestions").select("id, name, category, area, maps_link, note").eq("id", suggestionId).maybeSingle();
    if (res.error) throw dbError(res.error);
    suggestion = res.data;
  }
  if (suggestion) {
    const coords = coordsFromMapsLink(suggestion.maps_link);
    place = {
      ...place,
      name: suggestion.name,
      slug: slugify(suggestion.name),
      category: suggestion.category,
      neighborhood: suggestion.area.split(",")[0].trim(),
      published: false, // a suggestion starts as a draft until you've visited
      ...(coords ? { location: { ...coords, address: "" } } : {}),
    };
  }

  return (
    <div>
      <Link href={back} className="label text-muted hover:text-ink">← All places</Link>
      <h1 className="mb-8 mt-3 text-3xl font-semibold tracking-tight">{isNew ? (suggestion ? `New place: ${suggestion.name}` : "New place") : place.name}</h1>
      <PlaceForm
        initial={place}
        isNew={isNew}
        suggestions={suggestions}
        returnTo={back}
        newsletter={await newsletterStatus(supabase, placeRes?.data)}
        fromSuggestion={suggestion ? { id: suggestion.id, mapsLink: suggestion.maps_link, note: suggestion.note } : undefined}
      />
    </div>
  );
}
