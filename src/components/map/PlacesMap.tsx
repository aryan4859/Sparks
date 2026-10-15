"use client";

import dynamic from "next/dynamic";
import type { MapPin } from "./LeafletMap";

// Leaflet touches `window`, so it can only render in the browser.
const LeafletMap = dynamic(() => import("./LeafletMap"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-card" />,
});

export function PlacesMap({ pins }: { pins: MapPin[] }) {
  return <LeafletMap pins={pins} />;
}

export type { MapPin };
