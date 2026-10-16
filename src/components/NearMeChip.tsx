"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Asks the browser for the visitor's location (only when tapped), then reloads
 * the list sorted by distance. The location is rounded to ~100 m and isn't stored.
 */
export function NearMeChip({ baseHref }: { baseHref: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "locating" | "error">("idle");

  function locate() {
    if (!navigator.geolocation) return setState("error");
    setState("locating");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const url = new URL(baseHref, location.origin);
        url.searchParams.set("near", `${coords.latitude.toFixed(3)},${coords.longitude.toFixed(3)}`);
        router.push(url.pathname + url.search, { scroll: false });
        setState("idle");
      },
      () => setState("error"),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 },
    );
  }

  return (
    <button
      type="button"
      onClick={locate}
      disabled={state === "locating"}
      title={state === "error" ? "Location is blocked or unavailable — allow it in your browser and try again" : "Sort by distance from you"}
      className={`whitespace-nowrap rounded-full border px-3 py-1 text-xs transition disabled:opacity-60 ${
        state === "error" ? "border-danger text-danger" : "border-line text-muted hover:border-ink hover:text-ink"
      }`}
    >
      {state === "locating" ? "Locating…" : state === "error" ? "Location unavailable — retry" : "Near me"}
    </button>
  );
}
