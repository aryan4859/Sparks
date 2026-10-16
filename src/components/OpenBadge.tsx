"use client";

import { useEffect, useState } from "react";
import { isOpen, parseHours } from "@/lib/hours";

/**
 * A small "Open now" tag for place cards. Cards are often on pre-built pages, so
 * it's decided in the browser (Nepal time) and shows nothing until then — or at
 * all when the place is closed or its hours aren't understood.
 */
export function OpenBadge({ hours, className = "" }: { hours?: string; className?: string }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const schedule = parseHours(hours);
    if (!schedule) return;
    const update = () => setOpen(isOpen(schedule));
    update();
    const timer = setInterval(update, 60_000);
    return () => clearInterval(timer);
  }, [hours]);

  if (!open) return null;
  return (
    <span className={`label rounded-full bg-paper/90 px-2 py-0.5 text-[10px] text-ink backdrop-blur ${className}`}>
      <span aria-hidden className="mr-1 inline-block size-1.5 rounded-full bg-ink align-middle" />
      Open now
    </span>
  );
}
