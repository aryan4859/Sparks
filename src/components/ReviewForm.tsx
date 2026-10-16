"use client";

import { Fragment, useActionState, useState } from "react";
import { type ReviewState, submitReview } from "@/app/(site)/actions";
import { OFFLINE, withNetworkError } from "@/lib/safe-action";

const reviewAction = withNetworkError<ReviewState>(submitReview, (_, fd) => ({
  error: OFFLINE,
  values: { rating: String(fd.get("rating") ?? ""), body: String(fd.get("body") ?? ""), name: String(fd.get("name") ?? "") },
}));

const field = "w-full border border-line bg-transparent px-3 py-2.5 text-base outline-none transition focus:border-ink";

export function ReviewForm({ place }: { place: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(reviewAction, undefined);
  const v = state?.values;

  if (state?.ok) {
    return <p className="border border-line p-5 text-sm">Thank you! Your review will appear here after a quick check.</p>;
  }
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="border border-ink px-5 py-2.5 text-sm hover:bg-ink hover:text-paper">
        Write a review
      </button>
    );
  }
  return (
    <form action={action} className="space-y-5 border border-line p-5">
      <input type="hidden" name="place" value={place} />
      <fieldset>
        <legend className="label text-muted">Your rating *</legend>
        {/* Five radio buttons drawn as stars; picking one fills it and the ones before it. */}
        <div className="mt-2 flex flex-row-reverse justify-end gap-1 text-3xl [&>input:checked~label]:text-ink [&>label:hover]:text-ink [&>label:hover~label]:text-ink [&>input:focus-visible+label]:outline [&>input:focus-visible+label]:outline-2">
          {[5, 4, 3, 2, 1].map((n) => (
            <Fragment key={n}>
              <input id={`rating-${n}`} type="radio" name="rating" value={n} required defaultChecked={v?.rating === String(n)} className="sr-only" />
              <label htmlFor={`rating-${n}`} title={`${n} star${n > 1 ? "s" : ""}`} className="cursor-pointer text-line transition">
                ★
              </label>
            </Fragment>
          ))}
        </div>
      </fieldset>
      <label className="block">
        <span className="label text-muted">Your review</span>
        <textarea name="body" rows={4} maxLength={1500} defaultValue={v?.body} placeholder="What did you have? Would you go back?" className={`${field} mt-2 resize-y placeholder:text-muted/60`} />
      </label>
      <label className="block">
        <span className="label text-muted">Your name</span>
        <input name="name" maxLength={60} defaultValue={v?.name} placeholder="Optional — shown with your review" className={`${field} mt-2 placeholder:text-muted/60`} />
      </label>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      {state?.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      <div className="flex flex-wrap items-center gap-4">
        <button disabled={pending} className="bg-ink px-5 py-2.5 text-sm text-paper hover:opacity-85 disabled:opacity-50">
          {pending ? "Sending…" : "Send review"}
        </button>
        <p className="text-xs text-muted">Reviews are checked before they appear. See our <a href="/terms" className="underline">terms</a>.</p>
      </div>
    </form>
  );
}
