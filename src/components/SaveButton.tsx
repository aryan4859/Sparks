"use client";

import Link from "next/link";
import { toggleSaved, useSaved } from "@/lib/saved";

function Heart({ filled }: { filled: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
      <path d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 8 3.4 4.5 7 4.5c2 0 3.6 1.1 5 3 1.4-1.9 3-3 5-3 3.6 0 5.6 3.5 4.3 6.8-1.8 4.6-9.3 9.2-9.3 9.2z" />
    </svg>
  );
}

/** ♡ Save — on place cards (a round button over the photo) or on the place page (a chip). */
export function SaveButton({ slug, name, variant = "card" }: { slug: string; name: string; variant?: "card" | "page" }) {
  const saved = useSaved().includes(slug);
  const label = saved ? `Remove ${name} from saved places` : `Save ${name}`;

  if (variant === "page") {
    return (
      <button
        type="button"
        onClick={() => toggleSaved(slug)}
        aria-pressed={saved}
        aria-label={label}
        className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition ${
          saved ? "border-ink bg-ink text-paper" : "border-line hover:border-ink"
        }`}
      >
        <Heart filled={saved} />
        {saved ? "Saved" : "Save"}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={() => toggleSaved(slug)}
      aria-pressed={saved}
      aria-label={label}
      title={saved ? "Saved — tap to remove" : "Save"}
      className="flex size-9 items-center justify-center rounded-full bg-paper/90 text-ink backdrop-blur transition hover:scale-105"
    >
      <Heart filled={saved} />
    </button>
  );
}

/** Header link to /saved, with how many places are saved. */
export function SavedLink({ className = "" }: { className?: string }) {
  const count = useSaved().length;
  return (
    <Link href="/saved" aria-label={`Saved places${count ? ` (${count})` : ""}`} className={`relative text-muted hover:text-ink ${className}`}>
      <Heart filled={count > 0} />
      {count > 0 && (
        <span className="absolute -right-2.5 -top-2 min-w-4 rounded-full bg-ink px-1 text-center text-[10px] leading-4 text-paper">{count}</span>
      )}
    </Link>
  );
}
