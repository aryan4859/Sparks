import Link from "next/link";
import { categories, site } from "@/lib/site";
import { NewsletterForm } from "./NewsletterForm";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 md:grid-cols-[2fr_1fr_1fr]">
        <div className="max-w-sm">
          <p className="text-2xl font-semibold tracking-tight">
            Keep up with the <span className="font-serif text-3xl font-normal italic">latest spots</span>
          </p>
          <p className="mt-3 text-sm text-muted">An email whenever a new story goes up. New openings, quiet corners, no spam.</p>
          <NewsletterForm />
        </div>
        <div>
          <p className="label text-muted">Explore</p>
          <ul className="mt-4 space-y-2 text-sm">
            {Object.values(categories).map((c) => (
              <li key={c.href}>
                <Link href={c.href} className="hover:underline">{c.plural}</Link>
              </li>
            ))}
            <li><Link href="/explore" className="hover:underline">Map</Link></li>
          </ul>
        </div>
        <div>
          <p className="label text-muted">{site.name}</p>
          <ul className="mt-4 space-y-2 text-sm">
            <li><Link href="/journal" className="hover:underline">Journal</Link></li>
            <li><a href={site.instagram} className="hover:underline">Instagram</a></li>
          </ul>
        </div>
      </div>
      <div className="mx-auto flex max-w-7xl flex-wrap justify-between gap-2 px-4 pb-8 text-xs text-muted sm:px-6">
        <span>
          © {new Date().getFullYear()} {site.name} ·{" "}
          <Link href="/privacy" className="hover:text-ink hover:underline">Privacy</Link> ·{" "}
          <Link href="/terms" className="hover:text-ink hover:underline">Terms</Link>
        </span>
        <span>
          Place data ©{" "}
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="underline hover:text-ink">
            OpenStreetMap contributors
          </a>{" "}
          · Made in Kathmandu
        </span>
      </div>
    </footer>
  );
}
