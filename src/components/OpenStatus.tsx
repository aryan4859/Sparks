"use client";

import { useEffect, useState } from "react";
import { formatSchedule, openStatus, parseHours } from "@/lib/hours";

/**
 * Opening hours with a live "Open now · until 8:30pm" line. The page itself is
 * pre-built, so the status is worked out in the browser (Nepal time) and kept
 * fresh every minute; before that it shows the tidy hours.
 */
export function OpenStatus({ hours, compact = false }: { hours: string; compact?: boolean }) {
  const schedule = parseHours(hours);
  const tidy = schedule ? formatSchedule(schedule) : hours;
  const [status, setStatus] = useState<{ open: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!schedule) return;
    const update = () => setStatus(openStatus(schedule));
    update();
    const timer = setInterval(update, 60_000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- schedule is derived from `hours`
  }, [hours]);

  if (compact) return <>{status ? status.text : tidy}</>;
  return (
    <>
      {status && <span className={`block font-medium ${status.open ? "" : "text-muted"}`}>{status.text}</span>}
      <span className={status ? "block text-muted" : undefined}>{tidy}</span>
    </>
  );
}
