import type { Metadata } from "next";
import { Directory } from "@/components/Directory";

export const metadata: Metadata = { title: "Shops" };

export default async function ShopsPage({ searchParams }: PageProps<"/shops">) {
  return (
    <Directory
      base="/shops"
      category="shop"
      title={<>Shops &amp; <span className="font-serif font-normal italic">makers</span></>}
      intro="Fashion, beauty, accessories and online labels — independent, local and made with care."
      searchParams={await searchParams}
    />
  );
}
