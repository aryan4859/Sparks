"use client";

import { unstable_rethrow } from "next/navigation";
import { createContext, useCallback, useContext, useState, useTransition } from "react";
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

// ─── Uploads in progress ─────────────────────────────────────────────────
// Forms wrap themselves in <UploadsProvider>; photo uploads report through
// useUploads().track(), and the submit button waits until they've finished,
// so a place can't be saved without the photo that's still uploading.

const UploadsContext = createContext<{ busy: number; add: (delta: number) => void } | null>(null);

export function UploadsProvider({ children }: { children: React.ReactNode }) {
  const [busy, setBusy] = useState(0);
  const add = useCallback((delta: number) => setBusy((b) => Math.max(0, b + delta)), []);
  return <UploadsContext value={{ busy, add }}>{children}</UploadsContext>;
}

export function useUploads() {
  const ctx = useContext(UploadsContext);
  const add = ctx?.add;
  const track = useCallback(
    async <T,>(work: Promise<T>) => {
      add?.(1);
      try {
        return await work;
      } finally {
        add?.(-1);
      }
    },
    [add],
  );
  return { busy: (ctx?.busy ?? 0) > 0, track };
}

export function SubmitButton({ children, pendingText = "Saving…" }: { children: React.ReactNode; pendingText?: string }) {
  const { pending } = useFormStatus();
  const { busy: uploading } = useUploads();
  return (
    <button
      type="submit"
      disabled={pending || uploading}
      className="bg-ink px-5 py-2.5 text-sm text-paper transition hover:opacity-85 disabled:opacity-50"
    >
      {pending ? pendingText : uploading ? "Waiting for photo upload…" : children}
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

/** Delete with a confirm step, a pending state (no double clicks) and a visible error if it fails. */
export function DeleteButton({
  confirmText,
  action,
  label = "Delete",
  pendingLabel = "Deleting…",
}: {
  confirmText: string;
  action: () => Promise<{ error?: string } | undefined>;
  label?: string;
  pendingLabel?: string;
}) {
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
        {pending ? pendingLabel : label}
      </button>
      {error && <p className="mt-1 max-w-xs text-xs text-danger">{error}</p>}
    </div>
  );
}

/** A one-click action (e.g. Approve) with a pending state and a visible error if it fails. */
export function ActionButton({
  action,
  label,
  pendingLabel,
}: {
  action: () => Promise<{ error?: string } | undefined>;
  label: string;
  pendingLabel: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  return (
    <div>
      <button
        type="button"
        disabled={pending}
        className="bg-ink px-4 py-2 text-sm text-paper hover:opacity-85 disabled:opacity-50"
        onClick={() => {
          setError(undefined);
          startTransition(async () => {
            try {
              const result = await action();
              if (result?.error) setError(result.error);
            } catch (e) {
              unstable_rethrow(e);
              setError("Couldn't reach the server — check your connection and try again.");
            }
          });
        }}
      >
        {pending ? pendingLabel : label}
      </button>
      {error && <p className="mt-1 max-w-xs text-xs text-danger">{error}</p>}
    </div>
  );
}
