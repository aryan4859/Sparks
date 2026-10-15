import type { Metadata } from "next";
import { Directory } from "@/components/Directory";

export const metadata: Metadata = { title: "Explore the map" };

export default async function ExplorePage({ searchParams }: PageProps<"/explore">) {
  return (
    <Directory
      base="/explore"
      title={<>Explore <span className="font-serif font-normal italic">everything</span></>}
      intro="Every café, kitchen and shop we love, on one map. Filter by neighbourhood, budget or mood."
      searchParams={await searchParams}
    />
  );
}
