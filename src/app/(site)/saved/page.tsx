import type { Metadata } from "next";
import { SavedPlaces } from "@/components/SavedPlaces";

export const metadata: Metadata = { title: "Saved places", robots: { index: false } };

export default function SavedPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      <header className="max-w-2xl pb-12 pt-14 sm:pt-20">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">
          Saved <span className="font-serif font-normal italic">places</span>
        </h1>
        <p className="mt-4 text-muted sm:text-lg">
          Your shortlist, kept in this browser. No account needed — but it won&apos;t follow you to another phone or computer.
        </p>
      </header>
      <SavedPlaces />
    </div>
  );
}
