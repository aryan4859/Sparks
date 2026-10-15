import type { Metadata } from "next";
import { Directory } from "@/components/Directory";

export const metadata: Metadata = { title: "Restaurants" };

export default async function RestaurantsPage({ searchParams }: PageProps<"/restaurants">) {
  return (
    <Directory
      base="/restaurants"
      category="restaurant"
      title={<>Where to <span className="font-serif font-normal italic">eat</span></>}
      intro="Newari feasts, Thakali sets and tasting menus — signature dishes, vegetarian options and exactly where to find them."
      searchParams={await searchParams}
    />
  );
}
