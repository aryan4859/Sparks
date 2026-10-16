"use client";

import Link from "next/link";
import { useActionState } from "react";
import { unsubscribe } from "@/app/(site)/actions";
import { OFFLINE, withNetworkError } from "@/lib/safe-action";

const unsubscribeAction = withNetworkError<boolean | undefined | "offline">((_, fd) => unsubscribe(undefined, fd), () => "offline");

/** A button rather than unsubscribing on page load, so email link scanners can't trigger it. */
export function UnsubscribeForm({ token }: { token: string }) {
  const [done, action, pending] = useActionState(unsubscribeAction, undefined);

  if (done === true)
    return (
      <p className="mt-5 text-muted">
        You&apos;re unsubscribed and won&apos;t get any more emails. Changed your mind? Sign up again at the bottom of{" "}
        <Link href="/" className="underline hover:text-ink">any page</Link>.
      </p>
    );

  return (
    <form action={action} className="mt-6">
      <input type="hidden" name="token" value={token} />
      {done === false && <p className="mb-4 text-sm text-danger">This unsubscribe link isn&apos;t valid.</p>}
      {done === "offline" && <p className="mb-4 text-sm text-danger">{OFFLINE}</p>}
      <p className="text-muted">You&apos;ll stop getting emails about new journal stories.</p>
      <button disabled={pending} className="mt-6 bg-ink px-6 py-3 text-sm text-paper hover:opacity-85 disabled:opacity-50">
        {pending ? "Unsubscribing…" : "Unsubscribe"}
      </button>
    </form>
  );
}
