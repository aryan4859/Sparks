import Link from "next/link";
import { notFound } from "next/navigation";
import { AreaForm } from "@/components/admin/AreaForm";
import { getAreas } from "@/lib/queries";
import { dbError } from "@/lib/supabase/errors";
import { sessionClient } from "@/lib/supabase/server";
import type { Area } from "@/lib/types";

export default async function EditAreaPage({ params }: PageProps<"/admin/areas/[slug]">) {
  const { slug } = await params;
  // Only neighbourhoods with a published place have a page to write for.
  const area = (await getAreas()).find((a) => a.slug === slug);
  if (!area) notFound();
  const res = await (await sessionClient()).from("areas").select("*").eq("slug", slug).maybeSingle<Area>();
  if (res.error) throw dbError(res.error);

  return (
    <div>
      <Link href="/admin?tab=areas" className="label text-muted hover:text-ink">← All areas</Link>
      <h1 className="mb-8 mt-3 text-3xl font-semibold tracking-tight">{area.name}</h1>
      <AreaForm initial={{ slug, name: area.name, intro: res.data?.intro ?? "", cover: res.data?.cover ?? "" }} />
    </div>
  );
}
