import { dbError } from "@/lib/supabase/errors";
import Link from "next/link";
import { notFound } from "next/navigation";
import { emptyPlace, PlaceForm } from "@/components/admin/PlaceForm";
import { placeFromRow, type PlaceRow } from "@/lib/db";
import { sessionClient } from "@/lib/supabase/server";

export default async function EditPlacePage({ params, searchParams }: PageProps<"/admin/places/[slug]">) {
  const { slug } = await params;
  const backParam = (await searchParams).back;
  const back = typeof backParam === "string" && backParam.startsWith("/admin") ? backParam : "/admin";
  const isNew = slug === "new";
  const supabase = await sessionClient();

  const [placeRes, facetRes] = await Promise.all([
    isNew ? null : supabase.from("places").select("*").eq("slug", slug).maybeSingle<PlaceRow>(),
    supabase.from("places").select("type, neighborhood, ambience").returns<Pick<PlaceRow, "type" | "neighborhood" | "ambience">[]>(),
  ]);
  if (placeRes?.error) throw dbError(placeRes.error);
  if (!isNew && !placeRes?.data) notFound();

  const rows = facetRes.data ?? [];
  const uniq = (xs: string[]) => [...new Set(xs.filter(Boolean))].sort();
  const suggestions = {
    types: uniq(rows.map((r) => r.type)),
    areas: uniq(rows.map((r) => r.neighborhood)),
    ambience: uniq(rows.flatMap((r) => r.ambience ?? [])),
  };
  const place = placeRes?.data ? placeFromRow(placeRes.data) : emptyPlace();

  return (
    <div>
      <Link href={back} className="label text-muted hover:text-ink">← All places</Link>
      <h1 className="mb-8 mt-3 text-3xl font-semibold tracking-tight">{isNew ? "New place" : place.name}</h1>
      <PlaceForm initial={place} isNew={isNew} suggestions={suggestions} returnTo={back} />
    </div>
  );
}
