"use client";

import { useEffect } from "react";

/** Admin pages that failed to load. Shows the reference code to match against the server logs. */
export default function AdminError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => console.error(error), [error]);
  return (
    <div className="max-w-xl space-y-4 border border-danger/30 bg-danger-bg p-6">
      <h1 className="text-xl font-semibold text-danger">This page couldn&apos;t load</h1>
      <p className="text-sm">
        {/* In production, server error details are hidden; the digest matches the line in the Vercel logs. */}
        {error.digest ? `Something went wrong on the server (reference ${error.digest}). Check the logs on Vercel for details.` : error.message}
      </p>
      <p className="text-sm text-muted">
        If it mentions a missing table or column, re-run <code>supabase/schema.sql</code> in the Supabase SQL Editor.
      </p>
      <button onClick={retry} className="bg-ink px-5 py-2.5 text-sm text-paper hover:opacity-85">Try again</button>
    </div>
  );
}
