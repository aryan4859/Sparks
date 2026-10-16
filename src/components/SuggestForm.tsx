"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { suggestPlace } from "@/app/(site)/actions";
import { categories } from "@/lib/site";
import { OFFLINE, withNetworkError } from "@/lib/safe-action";

const suggestAction = withNetworkError(suggestPlace, (_, fd) => ({
  error: OFFLINE,
  values: {
    name: String(fd.get("name") ?? ""),
    category: String(fd.get("category") ?? ""),
    area: String(fd.get("area") ?? ""),
    maps_link: String(fd.get("maps_link") ?? ""),
    note: String(fd.get("note") ?? ""),
  },
}));

const field = "w-full border border-line bg-transparent px-3 py-2.5 text-base outline-none transition focus:border-ink";

export function SuggestForm() {
  // A new key remounts the form with fresh fields and state for "suggest another".
  const [round, setRound] = useState(0);
  return <Form key={round} onAnother={() => setRound((r) => r + 1)} />;
}

function Form({ onAnother }: { onAnother: () => void }) {
  const [state, action, pending] = useActionState(suggestAction, undefined);
  const v = state?.values;

  if (state?.ok) {
    return (
      <div className="border-t border-line pt-10">
        <p className="text-2xl font-semibold tracking-tight">
          Thank you — <span className="font-serif font-normal italic">noted.</span>
        </p>
        <p className="mt-3 text-muted">We&apos;ll pay it a visit. If it&apos;s a good fit, you&apos;ll see it here soon.</p>
        <div className="mt-8 flex flex-wrap gap-4 text-sm">
          <button onClick={onAnother} className="bg-ink px-5 py-2.5 text-paper hover:opacity-85">
            Suggest another
          </button>
          <Link href="/" className="self-center underline hover:text-muted">Back to the guide</Link>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-6 border-t border-line pt-10">
      <label className="block">
        <span className="label text-muted">Name of the place *</span>
        <input name="name" required maxLength={120} autoComplete="off" defaultValue={v?.name} className={`${field} mt-2`} />
      </label>

      <fieldset>
        <legend className="label text-muted">It&apos;s a…</legend>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {Object.entries(categories).map(([value, c], i) => (
            <label key={value} className="cursor-pointer">
              <input type="radio" name="category" value={value} defaultChecked={v ? v.category === value : i === 0} className="peer sr-only" />
              <span className="block border border-line px-3 py-2.5 text-center text-sm transition peer-checked:border-ink peer-checked:bg-ink peer-checked:text-paper peer-focus-visible:outline peer-focus-visible:outline-2">
                {c.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="block">
        <span className="label text-muted">Area</span>
        <input name="area" maxLength={120} defaultValue={v?.area} placeholder="e.g. Jhamsikhel, Lalitpur" className={`${field} mt-2 placeholder:text-muted/60`} />
      </label>

      <label className="block">
        <span className="label text-muted">Google Maps link</span>
        <input
          name="maps_link"
          inputMode="url"
          defaultValue={v?.maps_link}
          maxLength={600}
          placeholder="Optional — helps us find it"
          className={`${field} mt-2 placeholder:text-muted/60`}
        />
      </label>

      <label className="block">
        <span className="label text-muted">Why should we go?</span>
        <textarea
          name="note"
          maxLength={1000}
          defaultValue={v?.note}
          rows={4}
          placeholder="Optional — what to order, when to go, what makes it special"
          className={`${field} mt-2 resize-y placeholder:text-muted/60`}
        />
      </label>

      {/* Honeypot for bots */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />

      {state?.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-4">
        <button disabled={pending} className="bg-ink px-6 py-3 text-sm text-paper hover:opacity-85 disabled:opacity-50">
          {pending ? "Sending…" : "Send suggestion"}
        </button>
        <p className="text-xs text-muted">
          No sign-up needed, and we don&apos;t collect any personal details.
        </p>
      </div>
    </form>
  );
}
