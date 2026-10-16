"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { loadSavedPlaces } from "@/app/(site)/actions";
import { useSaved } from "@/lib/saved";
import type { Place } from "@/lib/types";
import { PlaceGrid } from "./PlaceCard";

/** The places saved on this device, loaded from the server by slug. */
export function SavedPlaces() {
  const slugs = useSaved();
  const key = slugs.join(",");
  const [loaded, setLoaded] = useState<{ key: string; places: Place[] } | { key: string; error: true } | null>(null);

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    loadSavedPlaces(key.split(","))
      .then((places) => !cancelled && setLoaded({ key, places }))
      .catch(() => !cancelled && setLoaded({ key, error: true }));
    return () => {
      cancelled = true;
    };
  }, [key]);

  if (!key) {
    return (
      <p className="border-t border-line py-16 text-center text-muted">
        Nothing saved yet. Tap ♡ on any place to keep it here.{" "}
        <Link href="/explore" className="text-ink underline">Start exploring →</Link>
      </p>
    );
  }
  if (!loaded) return <p className="border-t border-line py-16 text-center text-muted">Loading your places…</p>;
  if ("error" in loaded) {
    return <p className="border-t border-line py-16 text-center text-danger">Couldn&apos;t load your saved places — check your connection and reload.</p>;
  }
  // While a removal reloads, show what's still saved.
  const places = loaded.places.filter((p) => slugs.includes(p.slug));
  return (
    <>
      <p className="label mb-6 text-muted">
        {places.length} {places.length === 1 ? "place" : "places"}
      </p>
      <PlaceGrid places={places} />
    </>
  );
}
