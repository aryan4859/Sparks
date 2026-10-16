"use client";

import Link from "next/link";
import { useActionState } from "react";
import { subscribe } from "@/app/(site)/actions";

export function NewsletterForm() {
  const [state, action, pending] = useActionState(subscribe, undefined);

  if (state?.ok) return <p className="mt-5 border-b border-ink py-2 text-sm">Thanks — you&apos;re on the list.</p>;

  return (
    <form action={action} className="mt-5">
      <div className="flex border-b border-ink">
        <input
          type="email"
          name="email"
          required
          aria-label="Email address"
          placeholder="Email address"
          className="w-full bg-transparent py-2 text-sm outline-none placeholder:text-muted"
        />
        {/* Honeypot for bots */}
        <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
        <button disabled={pending} className="label shrink-0 py-2 disabled:opacity-50">
          {pending ? "Adding…" : "Subscribe →"}
        </button>
      </div>
      {state?.error && <p className="mt-2 text-xs text-danger">{state.error}</p>}
      <p className="mt-2 text-xs text-muted">
        Unsubscribe any time. See our{" "}
        <Link href="/privacy" className="underline hover:text-ink">privacy policy</Link>.
      </p>
    </form>
  );
}
