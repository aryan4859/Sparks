import type { Metadata } from "next";
import { ListCard } from "@/components/ListCard";
import { getLists, getPlacesBySlugs } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Lists",
  description: "Handpicked lists of cafés, restaurants and shops across Nepal.",
  alternates: { canonical: "/lists" },
};

export default async function ListsPage() {
  const lists = await getLists();
  // Count only places that are published, as on the list page itself.
  const counts = await Promise.all(lists.map(async (l) => (await getPlacesBySlugs(l.places)).length));
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      <header className="max-w-2xl pb-12 pt-14 sm:pt-20">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">
          Handpicked <span className="font-serif font-normal italic">lists</span>
        </h1>
        <p className="mt-4 text-muted sm:text-lg">The best of a kind, in one place: where to go for momo, a rainy afternoon or a long lunch.</p>
      </header>
      {lists.length === 0 ? (
        <p className="py-20 text-center text-muted">The first lists are on their way.</p>
      ) : (
        <div className="grid gap-x-5 gap-y-14 md:grid-cols-2 lg:grid-cols-3">
          {lists.map((list, i) => (
            <ListCard key={list.slug} list={list} count={counts[i]} />
          ))}
        </div>
      )}
    </div>
  );
}
