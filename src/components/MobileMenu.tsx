"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/** Full-screen menu for small screens; the desktop header shows the links inline. */
export function MobileMenu({ items }: { items: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close on navigation (also covers the browser back button).
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? "Close menu" : "Open menu"}
        className="-mr-2 p-2 text-ink"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
          {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M3 8h18M3 16h18" />}
        </svg>
      </button>

      {open &&
        // Portalled: the header's backdrop-blur would otherwise trap position:fixed inside it.
        createPortal(
        <nav id="mobile-menu" className="fixed inset-x-0 top-14 bottom-0 z-[1090] overflow-y-auto bg-paper px-4 pb-10 pt-6">
          <ul className="divide-y divide-line border-y border-line">
            {items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center justify-between py-4 text-3xl font-semibold tracking-tight ${
                    pathname === item.href ? "text-ink" : "text-ink/80"
                  }`}
                >
                  {item.label}
                  <span className="text-base font-normal text-muted">→</span>
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href="/explore"
            onClick={() => setOpen(false)}
            className="mt-8 flex items-center gap-3 border-b border-ink pb-3 text-lg text-muted"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            Search places, dishes, drinks…
          </Link>
        </nav>,
        document.body,
      )}
    </>
  );
}
