import Image from "next/image";
import Link from "next/link";
import type { CuratedList } from "@/lib/types";

export function ListCard({ list, count }: { list: CuratedList; count: number }) {
  return (
    <Link href={`/lists/${list.slug}`} className="group block">
      <div className="relative aspect-[3/2] overflow-hidden bg-card">
        {list.cover && (
          <Image
            src={list.cover}
            alt=""
            fill
            sizes="(min-width: 768px) 33vw, 100vw"
            className="object-cover transition duration-700 group-hover:scale-[1.03]"
          />
        )}
      </div>
      <p className="label mt-4 text-muted">
        List · {count} {count === 1 ? "place" : "places"}
      </p>
      <h3 className="mt-2 text-xl font-medium tracking-tight group-hover:underline">{list.title}</h3>
      {list.intro && <p className="mt-2 line-clamp-2 text-sm text-muted">{list.intro}</p>}
    </Link>
  );
}
