"use client";

/** Whether emailing is set up, how many would get it, and what happened the last time this was sent. */
export type Newsletter = {
  ready: boolean;
  subscribers: number;
  emailedAt: string | null;
  sentCount: number | null;
  error: string | null;
};

export function NewsletterOption({
  newsletter,
  published,
  checked,
  onChange,
}: {
  newsletter: Newsletter;
  published: boolean;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  const { emailedAt, sentCount, error } = newsletter;
  if (emailedAt) {
    const when = new Date(emailedAt).toLocaleDateString("en-GB", { dateStyle: "long" });
    if (sentCount === null) return <p className="text-xs text-muted">Emailing subscribers… (started {when}). Reload to check.</p>;
    return (
      <p className={`text-xs ${error ? "text-danger" : "text-muted"}`}>
        Emailed to {sentCount.toLocaleString()} subscriber{sentCount === 1 ? "" : "s"} on {when}.
        {error && ` Sending stopped early: ${error}`}
      </p>
    );
  }
  if (!newsletter.ready) {
    return (
      <p className="text-xs text-muted">
        Emailing subscribers is off: set the GMAIL_* settings, NEWSLETTER_FROM and NEXT_PUBLIC_SITE_URL in .env (see PROJECT_STATUS.md).
      </p>
    );
  }
  const n = newsletter.subscribers.toLocaleString();
  return (
    <div className="space-y-1">
      {error && <p className="text-xs text-danger">Last attempt to email subscribers failed: {error}</p>}
      <label className="flex items-center gap-2 text-sm">
        <input name="notify" type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        Email to {n} subscriber{newsletter.subscribers === 1 ? "" : "s"}
        <span className="text-xs text-muted">{published ? "when saved" : "once published"}</span>
      </label>
    </div>
  );
}
