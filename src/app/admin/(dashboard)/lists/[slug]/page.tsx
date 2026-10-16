import Link from "next/link";
import { notFound } from "next/navigation";
import { ListForm } from "@/components/admin/ListForm";
import { emptyList, listFromRow, type ListRow } from "@/lib/db";
import { dbError } from "@/lib/supabase/errors";
import { sessionClient } from "@/lib/supabase/server";

export default async function EditListPage({ params }: PageProps<"/admin/lists/[slug]">) {
  const { slug } = await params;
  const isNew = slug === "new";
  const supabase = await sessionClient();
  const [listRes, placesRes] = await Promise.all([
    isNew ? null : supabase.from("lists").select("*").eq("slug", slug).maybeSingle<ListRow>(),
    supabase
      .from("places")
      .select("slug, name, neighborhood")
      .eq("published", true)
      .order("name")
      .returns<{ slug: string; name: string; neighborhood: string }[]>(),
  ]);
  if (listRes?.error) throw dbError(listRes.error);
  if (placesRes.error) throw dbError(placesRes.error);
  if (!isNew && !listRes?.data) notFound();
  const list = listRes?.data ? listFromRow(listRes.data) : emptyList();

  return (
    <div>
      <Link href="/admin?tab=lists" className="label text-muted hover:text-ink">← All lists</Link>
      <h1 className="mb-8 mt-3 text-3xl font-semibold tracking-tight">{isNew ? "New list" : list.title}</h1>
      <ListForm initial={list} isNew={isNew} places={placesRes.data} />
    </div>
  );
}
