"use client";

import { unstable_rethrow } from "next/navigation";
import { useState, useTransition } from "react";
import { useFormStatus } from "react-dom";

export const inputClass =
  "w-full border border-line bg-field px-3 py-2 text-sm outline-none transition focus:border-ink";

export function Field({
  label,
  hint,
  children,
  className = "",
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="label text-muted">{label}</span>
      <div className="mt-1.5">{children}</div>
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function Panel({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="border border-line bg-paper p-5 sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="font-medium">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function SubmitButton({ children, pendingText = "Saving…" }: { children: React.ReactNode; pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-ink px-5 py-2.5 text-sm text-paper transition hover:opacity-85 disabled:opacity-50"
    >
      {pending ? pendingText : children}
    </button>
  );
}

export function GhostButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={`border border-line px-3 py-1.5 text-xs text-muted transition hover:border-ink hover:text-ink disabled:opacity-40 ${props.className ?? ""}`}
    />
  );
}

export function ErrorNote({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="border border-danger/30 bg-danger-bg px-4 py-3 text-sm text-danger">{message}</p>;
}

export function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Delete with a confirm step, a pending state (no double clicks) and a visible error if it fails. */
export function DeleteButton({ confirmText, action }: { confirmText: string; action: () => Promise<{ error?: string } | undefined> }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  return (
    <div className="text-right">
      <button
        type="button"
        disabled={pending}
        className="text-sm text-danger hover:underline disabled:opacity-50"
        onClick={() => {
          if (!confirm(confirmText)) return;
          setError(undefined);
          startTransition(async () => {
            try {
              const result = await action();
              if (result?.error) setError(result.error);
            } catch (e) {
              unstable_rethrow(e); // the redirect after a successful delete isn't an error
              setError("Couldn't reach the server — check your connection and try again.");
            }
          });
        }}
      >
        {pending ? "Deleting…" : "Delete"}
      </button>
      {error && <p className="mt-1 max-w-xs text-xs text-danger">{error}</p>}
    </div>
  );
}
