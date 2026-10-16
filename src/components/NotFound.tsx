import Link from "next/link";

export function NotFound() {
  return (
    <section className="mx-auto max-w-xl px-4 py-24 text-center sm:px-6 sm:py-32">
      <p className="label text-muted">404</p>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-6xl">
        This corner is <span className="font-serif font-normal italic">empty.</span>
      </h1>
      <p className="mt-5 text-muted">The page you&apos;re looking for has moved, closed, or never existed.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3 text-sm">
        <Link href="/" className="bg-ink px-5 py-2.5 text-paper hover:opacity-85">Back to the guide</Link>
        <Link href="/explore" className="border border-ink px-5 py-2.5 hover:bg-ink hover:text-paper">Explore the map</Link>
      </div>
    </section>
  );
}
