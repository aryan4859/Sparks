"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { directionsUrl } from "@/lib/site";

export type MapPin = {
  slug: string;
  name: string;
  label: string;
  lat: number;
  lng: number;
};

const pinIcon = L.divIcon({ className: "", html: '<div class="map-pin"></div>', iconSize: [14, 14] });

function FitBounds({ pins }: { pins: MapPin[] }) {
  const map = useMap();
  useEffect(() => {
    if (pins.length === 0) return;
    if (pins.length === 1) {
      map.setView([pins[0].lat, pins[0].lng], 16);
      return;
    }
    map.fitBounds(L.latLngBounds(pins.map((p) => [p.lat, p.lng])), { padding: [40, 40], maxZoom: 15 });
  }, [map, pins]);
  return null;
}

export default function LeafletMap({ pins }: { pins: MapPin[] }) {
  return (
    <MapContainer
      center={[27.7, 85.32]}
      zoom={13}
      scrollWheelZoom={false}
      className="h-full w-full"
    >
      {/* Free, keyless OpenStreetMap tiles; desaturated in globals.css to stay quiet */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds pins={pins} />
      {pins.map((p) => (
        <Marker key={p.slug} position={[p.lat, p.lng]} icon={pinIcon}>
          <Popup>
            <a href={`/places/${p.slug}`} className="block font-medium text-ink">{p.name}</a>
            <span className="label text-muted">{p.label}</span>
            <a
              href={directionsUrl(p.lat, p.lng)}
              target="_blank"
              rel="noreferrer"
              className="mt-2 block text-xs underline"
            >
              Directions ↗
            </a>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
