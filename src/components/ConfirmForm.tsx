"use client";

import Link from "next/link";
import { useActionState } from "react";
import { confirmSubscription, type ConfirmState } from "@/app/(site)/actions";
import { OFFLINE, withNetworkError } from "@/lib/safe-action";

const confirmAction = withNetworkError<ConfirmState>(confirmSubscription, () => "offline");

/**
 * A button rather than confirming on page load: email security scanners open
 * links automatically, and must not be able to confirm a subscription.
 */
export function ConfirmForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(confirmAction, undefined);

  if (state === "confirmed" || state === "already") {
    return (
      <div className="mt-5 text-muted">
        <p>
          {state === "confirmed"
            ? "You're subscribed — thank you! A welcome email is on its way."
            : "You're already subscribed. Nothing else to do."}
        </p>
        <Link href="/" className="mt-8 inline-block bg-ink px-6 py-3 text-sm text-paper hover:opacity-85">Back to the guide</Link>
      </div>
    );
  }

  return (
    <form action={action} className="mt-6">
      <input type="hidden" name="token" value={token} />
      {state === "invalid" && (
        <p className="mb-4 text-sm text-danger">This link has expired or isn&apos;t valid. Sign up again at the bottom of any page.</p>
      )}
      {state === "error" && <p className="mb-4 text-sm text-danger">Something went wrong — please try again.</p>}
      {state === "offline" && <p className="mb-4 text-sm text-danger">{OFFLINE}</p>}
      <p className="text-muted">Confirm to get an email whenever a new place or story goes up.</p>
      <button disabled={pending} className="mt-6 bg-ink px-6 py-3 text-sm text-paper hover:opacity-85 disabled:opacity-50">
        {pending ? "Confirming…" : "Confirm my subscription"}
      </button>
    </form>
  );
}
