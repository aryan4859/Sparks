import Image from "next/image";
import Link from "next/link";
import { budgetLabel, categories } from "@/lib/site";
import type { Place } from "@/lib/types";
import { OpenBadge } from "./OpenBadge";

export function PlaceCard({ place, priority }: { place: Place & { km?: number }; priority?: boolean }) {
  return (
    <Link href={`/places/${place.slug}`} className="group block">
      <div className="relative aspect-[4/5] overflow-hidden bg-card">
        <Image
          src={place.cover}
          alt={place.name}
          fill
          priority={priority}
          sizes="(min-width: 1024px) 25vw, 50vw"
          className="object-cover transition duration-700 group-hover:scale-[1.03]"
        />
        <OpenBadge hours={place.hours} className="absolute left-2 top-2" />
      </div>
      <div className="mt-2.5 flex items-baseline justify-between gap-2 sm:mt-3 sm:gap-3">
        <h3 className="min-w-0 text-sm font-medium leading-snug tracking-tight sm:text-base">{place.name}</h3>
        <span className="shrink-0 text-[11px] text-muted sm:text-xs">{budgetLabel[place.budget]}</span>
      </div>
      <p className="label mt-1 truncate text-muted">
        {categories[place.category].label} · {place.neighborhood}
        {place.km !== undefined && ` · ${place.km < 1 ? `${Math.round(place.km * 1000)} m` : `${place.km.toFixed(1)} km`}`}
      </p>
    </Link>
  );
}

export function PlaceGrid({ places, cols = 4 }: { places: (Place & { km?: number })[]; cols?: 2 | 3 | 4 }) {
  // Two columns even on phones: one tall photo per row makes pages endless to scroll.
  const grid = {
    2: "",
    3: "lg:grid-cols-3",
    4: "lg:grid-cols-4",
  }[cols];
  return (
    <div className={`grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 sm:gap-y-10 ${grid}`}>
      {places.map((p, i) => (
        <PlaceCard key={p.slug} place={p} priority={i < 2} />
      ))}
    </div>
  );
}
