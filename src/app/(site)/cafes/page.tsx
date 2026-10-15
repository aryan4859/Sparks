import type { Metadata } from "next";
import { Directory } from "@/components/Directory";

export const metadata: Metadata = { title: "Cafés" };

export default async function CafesPage({ searchParams }: PageProps<"/cafes">) {
  return (
    <Directory
      base="/cafes"
      category="cafe"
      title={<>Cafés worth <span className="font-serif font-normal italic">lingering in</span></>}
      intro="Specialty roasters, rooftop tea houses and garden courtyards — with the drinks to order and what they cost."
      searchParams={await searchParams}
    />
  );
}
