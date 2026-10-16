"use client";

import { useActionState, useState } from "react";
import { saveArea } from "@/app/admin/actions";
import { OFFLINE, withNetworkError } from "@/lib/safe-action";
import type { Area } from "@/lib/types";
import { ImageUpload } from "./ImageUpload";
import { ErrorNote, Field, inputClass, Panel, SubmitButton, UploadsProvider } from "./ui";

const saveAreaAction = withNetworkError(saveArea, () => ({ error: OFFLINE }));

export function AreaForm({ initial }: { initial: Area }) {
  const [cover, setCover] = useState(initial.cover);
  const [state, action] = useActionState(saveAreaAction, undefined);
  return (
    <UploadsProvider>
      <form action={action} className="space-y-6">
        <input type="hidden" name="slug" value={initial.slug} />
        <input type="hidden" name="name" value={initial.name} />
        <input type="hidden" name="cover" value={cover} />
        <ErrorNote message={state?.error} />
        <Panel title="Guide">
          <div className="grid gap-5 sm:grid-cols-[1fr_260px]">
            <Field label="Intro" hint="What the area is like and when to go. Leave empty for a page with just the places and map.">
              <textarea name="intro" defaultValue={initial.intro} className={`${inputClass} min-h-48`} />
            </Field>
            <Field label="Cover photo (optional)">
              <ImageUpload value={cover} onChange={setCover} folder={`areas/${initial.slug}`} aspect="aspect-[21/9]" />
            </Field>
          </div>
        </Panel>
        <div className="flex items-center gap-4">
          <SubmitButton>Save guide</SubmitButton>
          <a href={`/areas/${initial.slug}`} target="_blank" className="text-sm text-muted underline hover:text-ink">View ↗</a>
        </div>
      </form>
    </UploadsProvider>
  );
}
