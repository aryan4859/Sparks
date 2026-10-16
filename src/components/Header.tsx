import Link from "next/link";
import { MobileMenu } from "@/components/MobileMenu";
import { SparksLogo } from "@/components/SparksLogo";
import { SavedLink } from "@/components/SaveButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { site } from "@/lib/site";

const nav = [
  { href: "/cafes", label: "Cafés" },
  { href: "/restaurants", label: "Restaurants" },
  { href: "/shops", label: "Shops" },
  { href: "/explore", label: "Map" },
  { href: "/lists", label: "Lists" },
  { href: "/journal", label: "Journal" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-[1100] border-b border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6">
        <Link id="site-logo" href="/" aria-label={`${site.name} — home`} className="block">
          <SparksLogo className="block h-[30px] w-auto" />
        </Link>
        {/* Desktop */}
        <nav className="hidden items-center gap-7 text-sm md:flex">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="whitespace-nowrap text-muted transition hover:text-ink">
              {item.label}
            </Link>
          ))}
          <SavedLink />
          <Link href="/explore" aria-label="Search" className="text-muted hover:text-ink">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          </Link>
          <ThemeToggle />
        </nav>
        {/* Mobile */}
        <div className="flex items-center gap-3 md:hidden">
          <SavedLink className="p-2" />
          <ThemeToggle className="p-2" />
          <MobileMenu items={nav} />
        </div>
      </div>
    </header>
  );
}
