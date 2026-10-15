"use client";

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
