"use client";

import { useActionState } from "react";
import { ErrorNote, Field, inputClass, SubmitButton } from "@/components/admin/ui";
import { site } from "@/lib/site";
import { signIn } from "../actions";

export default function LoginPage() {
  const [state, action] = useActionState(signIn, undefined);
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-20">
      <form action={action} className="w-full max-w-sm space-y-5">
        <div>
          <p className="text-xl font-semibold tracking-tight">
            {site.name}
            <span className="text-spark">.</span> <span className="font-serif font-normal italic">admin</span>
          </p>
          <p className="mt-1 text-sm text-muted">Sign in to manage places and the journal.</p>
        </div>
        <ErrorNote message={state?.error} />
        <Field label="Email">
          <input name="email" type="email" required autoComplete="email" className={inputClass} />
        </Field>
        <Field label="Password">
          <input name="password" type="password" required autoComplete="current-password" className={inputClass} />
        </Field>
        <SubmitButton pendingText="Signing in…">Sign in</SubmitButton>
      </form>
    </div>
  );
}
