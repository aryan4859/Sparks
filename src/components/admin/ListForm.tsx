"use client";

import { useActionState, useState } from "react";
import { deleteList, saveList } from "@/app/admin/actions";
import { OFFLINE, withNetworkError } from "@/lib/safe-action";
import type { CuratedList } from "@/lib/types";
import { slugify } from "@/lib/validate";
import { ImageUpload } from "./ImageUpload";
import { DeleteButton, ErrorNote, Field, GhostButton, inputClass, Panel, SubmitButton, UploadsProvider } from "./ui";

const saveListAction = withNetworkError(saveList, () => ({ error: OFFLINE }));

type PlaceOption = { slug: string; name: string; neighborhood: string };

/** The form, inside an UploadsProvider so saving waits for the cover upload. */
export function ListForm(props: React.ComponentProps<typeof ListFormFields>) {
  return (
    <UploadsProvider>
      <ListFormFields {...props} />
    </UploadsProvider>
  );
}

function ListFormFields({ initial, isNew, places }: { initial: CuratedList; isNew: boolean; places: PlaceOption[] }) {
  const [list, setList] = useState(initial);
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [state, action] = useActionState(saveListAction, undefined);
  const set = <K extends keyof CuratedList>(key: K, value: CuratedList[K]) => setList((l) => ({ ...l, [key]: value }));
  const slugEditable = isNew || !initial.published;

  const byslug = new Map(places.map((p) => [p.slug, p]));
  const available = places.filter((p) => !list.places.includes(p.slug));
  const move = (from: number, to: number) => {
    const next = [...list.places];
    next.splice(to, 0, next.splice(from, 1)[0]);
    set("places", next);
  };

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="payload" value={JSON.stringify(list)} />
      <input type="hidden" name="isNew" value={isNew ? "1" : "0"} />
      <input type="hidden" name="originalSlug" value={initial.slug} />
      <ErrorNote message={state?.error} />

      <Panel title="List">
        <div className="grid gap-5 sm:grid-cols-[1fr_220px]">
          <div className="space-y-5">
            <Field label="Title" hint='e.g. "Best momo in Patan", "Rainy-day cafés"'>
              <input
                required
                className={`${inputClass} text-lg`}
                value={list.title}
                onChange={(e) => {
                  const title = e.target.value;
                  setList((l) => ({ ...l, title, slug: slugTouched || !slugEditable ? l.slug : slugify(title) }));
                }}
              />
            </Field>
            <Field label="URL slug" hint={slugEditable ? `/lists/${list.slug || "…"} — can be changed until published` : "Locked: this list has been published"}>
              <input
                className={inputClass}
                value={list.slug}
                disabled={!slugEditable}
                onChange={(e) => {
                  setSlugTouched(true);
                  set("slug", slugify(e.target.value));
                }}
              />
            </Field>
            <Field label="Intro" hint="A few sentences on why these places, shown at the top of the list">
              <textarea className={`${inputClass} min-h-28`} value={list.intro} onChange={(e) => set("intro", e.target.value)} />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={list.published} onChange={(e) => set("published", e.target.checked)} />
              Published
            </label>
          </div>
          <Field label="Cover photo">
            <ImageUpload value={list.cover} onChange={(url) => set("cover", url)} folder={`lists/${list.slug || "new"}`} aspect="aspect-[3/2]" />
          </Field>
        </div>
      </Panel>

      <Panel title={`Places (${list.places.length})`}>
        <ol className="divide-y divide-line border-y border-line">
          {list.places.map((slug, i) => {
            const p = byslug.get(slug);
            return (
              <li key={slug} className="flex items-center gap-3 py-2.5 text-sm">
                <span className="w-6 tabular-nums text-muted">{i + 1}.</span>
                <span className="min-w-0 flex-1 truncate">
                  {p ? p.name : slug}
                  {p?.neighborhood && <span className="text-muted"> · {p.neighborhood}</span>}
                  {!p && <span className="label ml-2 text-warn">Unpublished or deleted — hidden on the site</span>}
                </span>
                <GhostButton disabled={i === 0} onClick={() => move(i, i - 1)} aria-label="Move up">↑</GhostButton>
                <GhostButton disabled={i === list.places.length - 1} onClick={() => move(i, i + 1)} aria-label="Move down">↓</GhostButton>
                <GhostButton onClick={() => set("places", list.places.filter((s) => s !== slug))}>Remove</GhostButton>
              </li>
            );
          })}
          {list.places.length === 0 && <li className="py-3 text-sm text-muted">No places yet — add some below.</li>}
        </ol>
        <select
          className={`${inputClass} mt-4`}
          value=""
          onChange={(e) => e.target.value && set("places", [...list.places, e.target.value])}
          disabled={available.length === 0}
        >
          <option value="">{available.length ? "+ Add a published place…" : "All published places are in this list"}</option>
          {available.map((p) => (
            <option key={p.slug} value={p.slug}>
              {p.name}
              {p.neighborhood ? ` · ${p.neighborhood}` : ""}
            </option>
          ))}
        </select>
      </Panel>

      <div className="sticky bottom-0 -mx-4 flex items-center justify-between gap-4 border-t border-line bg-surface/95 px-4 py-4 backdrop-blur sm:mx-0 sm:px-0">
        <div className="flex gap-3">
          <SubmitButton>{isNew ? "Create list" : "Save changes"}</SubmitButton>
          {!isNew && initial.published && (
            <a href={`/lists/${initial.slug}`} target="_blank" className="self-center text-sm text-muted underline hover:text-ink">
              View ↗
            </a>
          )}
        </div>
        {!isNew && <DeleteButton confirmText={`Delete the list “${initial.title}”? The places themselves stay.`} action={() => deleteList(initial.slug)} />}
      </div>
    </form>
  );
}
