"use client";

import Link from "next/link";
import { useEffect } from "react";

/** Shown instead of a page that failed to load (e.g. the database was unreachable). */
export default function SiteError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => console.error(error), [error]);
  return (
    <section className="mx-auto max-w-xl px-4 py-24 text-center sm:px-6 sm:py-32">
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
        Something went <span className="font-serif font-normal italic">wrong.</span>
      </h1>
      <p className="mt-5 text-muted">This page didn&apos;t load — usually a brief connection hiccup. Please try again.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3 text-sm">
        <button onClick={retry} className="bg-ink px-5 py-2.5 text-paper hover:opacity-85">Try again</button>
        <Link href="/" className="border border-ink px-5 py-2.5 hover:bg-ink hover:text-paper">Back to the guide</Link>
      </div>
    </section>
  );
}
