"use client";

import { useActionState, useState } from "react";
import { deletePlace, savePlace } from "@/app/admin/actions";
import { budgetHint, budgetLabel, type Feature, features } from "@/lib/site";
import type { Budget, Category, MenuItem, MenuSection, Place } from "@/lib/types";
import { formatSchedule, parseHours } from "@/lib/hours";
import { coordsFromMapsLink, slugify } from "@/lib/validate";
import { ImageUpload } from "./ImageUpload";
import { type Newsletter, NewsletterOption } from "./NewsletterOption";
import { DeleteButton, ErrorNote, Field, GhostButton, inputClass, Panel, SubmitButton, UploadsProvider } from "./ui";
import { OFFLINE, withNetworkError } from "@/lib/safe-action";

export type Suggestions = { types: string[]; areas: string[]; ambience: string[] };

/** Shows how the hours were understood, so "Open now" works for this place. */
function hoursHint(hours?: string) {
  const examples = "e.g. 9:00am - 8:30pm · Mon-Fri 8am-6pm; Sat 9am-2pm; Sun closed · 24/7";
  if (!hours?.trim()) return examples;
  const schedule = parseHours(hours);
  return schedule
    ? `✓ Understood as: ${formatSchedule(schedule)}`
    : `Not understood, so “Open now” will leave this place out. Try: ${examples}`;
}

const savePlaceAction = withNetworkError(savePlace, () => ({ error: OFFLINE }));

/** The form, inside an UploadsProvider so saving waits for photo uploads. */
export function PlaceForm(props: React.ComponentProps<typeof PlaceFormFields>) {
  return (
    <UploadsProvider>
      <PlaceFormFields {...props} />
    </UploadsProvider>
  );
}

function PlaceFormFields({
  initial,
  isNew,
  suggestions,
  returnTo,
  newsletter,
  fromSuggestion,
}: {
  initial: Place;
  isNew: boolean;
  suggestions: Suggestions;
  returnTo: string;
  newsletter: Newsletter;
  /** Set when this new place starts from a visitor's suggestion. */
  fromSuggestion?: { id: string; mapsLink: string; note: string };
}) {
  const [place, setPlace] = useState<Place>(initial);
  // Default on for places that haven't been published yet; opt-in for ones already live.
  const [notify, setNotify] = useState(isNew || initial.published === false);
  const [slugTouched, setSlugTouched] = useState(!isNew);
  // The URL can change until a place is published; after that, links to it may exist.
  const slugEditable = isNew || initial.published === false;
  const [mapsLink, setMapsLink] = useState(fromSuggestion?.mapsLink ?? "");
  const [state, action] = useActionState(savePlaceAction, undefined);

  const set = <K extends keyof Place>(key: K, value: Place[K]) => setPlace((p) => ({ ...p, [key]: value }));
  const loc = place.location ?? { lat: 0, lng: 0, address: "" };
  const setLoc = (patch: Partial<typeof loc>) => set("location", { ...loc, ...patch });

  const itemLabel = place.category === "cafe" ? "Signature drinks" : place.category === "restaurant" ? "Signature dishes" : "What to buy";

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="payload" value={JSON.stringify(place)} />
      <input type="hidden" name="isNew" value={isNew ? "1" : "0"} />
      {fromSuggestion && (
        <>
          <input type="hidden" name="suggestionId" value={fromSuggestion.id} />
          <p className="border border-line bg-paper px-4 py-3 text-sm">
            <span className="label text-muted">From a visitor&apos;s suggestion</span>
            {fromSuggestion.note && <span className="mt-1 block whitespace-pre-line">“{fromSuggestion.note}”</span>}
            {fromSuggestion.mapsLink && !coordsFromMapsLink(fromSuggestion.mapsLink) && (
              <span className="mt-1 block text-muted">
                The map link is a short link — open it, then paste the full Google Maps URL below to fill the location.
              </span>
            )}
          </p>
        </>
      )}
      <input type="hidden" name="originalSlug" value={initial.slug} />
      <input type="hidden" name="returnTo" value={returnTo} />

      <datalist id="types">{suggestions.types.map((t) => <option key={t} value={t} />)}</datalist>
      <datalist id="areas">{suggestions.areas.map((a) => <option key={a} value={a} />)}</datalist>

      <ErrorNote message={state?.error} />

      <Panel title="Basics">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Name">
            <input
              className={inputClass}
              value={place.name}
              required
              onChange={(e) => {
                const name = e.target.value;
                setPlace((p) => ({ ...p, name, slug: slugTouched ? p.slug : slugify(name) }));
              }}
            />
          </Field>
          <Field
            label="URL slug"
            hint={slugEditable ? `/places/${place.slug || "…"} — can be changed until published` : "Locked: this place has been published"}
          >
            <input
              className={inputClass}
              value={place.slug}
              disabled={!slugEditable}
              onChange={(e) => {
                setSlugTouched(true);
                set("slug", slugify(e.target.value));
              }}
            />
          </Field>
          <Field label="Category">
            <select className={inputClass} value={place.category} onChange={(e) => set("category", e.target.value as Category)}>
              <option value="cafe">Café</option>
              <option value="restaurant">Restaurant</option>
              <option value="shop">Shop</option>
            </select>
          </Field>
          <Field label="Type" hint="e.g. Specialty coffee, Newari, Fashion, Beauty, Online store">
            <input className={inputClass} list="types" value={place.type} onChange={(e) => set("type", e.target.value)} />
          </Field>
          <Field label="Tagline" className="sm:col-span-2" hint="One line shown under the name">
            <input className={inputClass} value={place.tagline} onChange={(e) => set("tagline", e.target.value)} />
          </Field>
          <Field label="Our take" className="sm:col-span-2">
            <textarea className={`${inputClass} min-h-40`} value={place.review} onChange={(e) => set("review", e.target.value)} />
          </Field>
        </div>
      </Panel>

      <Panel title="Filters">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Budget">
            <div className="flex gap-2">
              {([1, 2, 3] as Budget[]).map((b) => (
                <button
                  key={b}
                  type="button"
                  title={budgetHint[b]}
                  onClick={() => set("budget", b)}
                  className={`flex-1 border px-3 py-2 text-sm ${place.budget === b ? "border-ink bg-ink text-paper" : "border-line bg-field"}`}
                >
                  {budgetLabel[b]}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Vegetarian">
            <select
              className={inputClass}
              value={place.vegetarian ?? ""}
              onChange={(e) => set("vegetarian", (e.target.value || undefined) as Place["vegetarian"])}
            >
              <option value="">Not specified</option>
              <option value="veg-friendly">Vegetarian-friendly</option>
              <option value="pure-veg">Pure vegetarian</option>
            </select>
          </Field>
          <fieldset className="sm:col-span-2">
            <legend className="label text-muted">Good to know</legend>
            <div className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
              {(Object.keys(features) as Feature[]).map((key) => (
                <label key={key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={place.features.includes(key)}
                    onChange={(e) =>
                      set("features", e.target.checked ? [...place.features, key] : place.features.filter((f) => f !== key))
                    }
                  />
                  {features[key]}
                </label>
              ))}
            </div>
          </fieldset>
          <Field
            label="Ambience"
            className="sm:col-span-2"
            hint={`Comma-separated. In use: ${suggestions.ambience.join(", ") || "none yet"}`}
          >
            <input
              className={inputClass}
              defaultValue={place.ambience.join(", ")}
              onChange={(e) => set("ambience", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
            />
          </Field>
          <div className="flex flex-wrap gap-6 sm:col-span-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!place.featured} onChange={(e) => set("featured", e.target.checked)} />
              Featured on home page
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={place.published !== false} onChange={(e) => set("published", e.target.checked)} />
              Published (uncheck to keep as draft)
            </label>
          </div>
          <div className="sm:col-span-2">
            <NewsletterOption newsletter={newsletter} published={place.published !== false} checked={notify} onChange={setNotify} />
          </div>
        </div>
      </Panel>

      <Panel title="Photos">
        <div className="grid gap-5 sm:grid-cols-[200px_1fr]">
          <Field label="Cover">
            <ImageUpload value={place.cover} onChange={(url) => set("cover", url)} folder={`places/${place.slug || "new"}`} />
          </Field>
          <div>
            <span className="label text-muted">Gallery — first photo is the large one</span>
            <div className="mt-1.5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {place.gallery.map((src, i) => (
                <div key={src + i} className="space-y-1">
                  <ImageUpload
                    value={src}
                    aspect="aspect-[4/3]"
                    folder={`places/${place.slug || "new"}`}
                    onChange={(url) => set("gallery", place.gallery.map((g, j) => (j === i ? url : g)))}
                  />
                  <div className="flex gap-1">
                    <GhostButton disabled={i === 0} onClick={() => set("gallery", move(place.gallery, i, i - 1))}>←</GhostButton>
                    <GhostButton disabled={i === place.gallery.length - 1} onClick={() => set("gallery", move(place.gallery, i, i + 1))}>→</GhostButton>
                    <GhostButton onClick={() => set("gallery", place.gallery.filter((_, j) => j !== i))}>Remove</GhostButton>
                  </div>
                </div>
              ))}
              <ImageUpload
                value=""
                aspect="aspect-[4/3]"
                label="+ Add photo"
                folder={`places/${place.slug || "new"}`}
                onChange={(url) => set("gallery", [...place.gallery, url])}
              />
            </div>
          </div>
        </div>
      </Panel>

      <Panel title="Location & details">
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              checked={!!place.online}
              onChange={(e) =>
                setPlace((p) => ({
                  ...p,
                  online: e.target.checked,
                  neighborhood: e.target.checked ? "Online" : p.neighborhood === "Online" ? "" : p.neighborhood,
                  location: e.target.checked ? undefined : p.location,
                }))
              }
            />
            Online-only store (no physical location)
          </label>
          {!place.online && (
            <>
              <Field
                label="Google Maps link or coordinates"
                className="sm:col-span-2"
                hint="Open the place in Google Maps, copy the URL from the address bar (or right-click the pin → copy coordinates) and paste here."
              >
                <input
                  className={inputClass}
                  value={mapsLink}
                  placeholder="https://www.google.com/maps/place/…/@27.6795,85.309,17z"
                  onChange={(e) => {
                    setMapsLink(e.target.value);
                    const c = coordsFromMapsLink(e.target.value);
                    if (c) setLoc(c);
                  }}
                />
              </Field>
              <Field label="Latitude">
                <input className={inputClass} type="number" step="any" value={place.location ? loc.lat : ""} onChange={(e) => setLoc({ lat: Number(e.target.value) })} />
              </Field>
              <Field label="Longitude">
                <input className={inputClass} type="number" step="any" value={place.location ? loc.lng : ""} onChange={(e) => setLoc({ lng: Number(e.target.value) })} />
              </Field>
              <Field label="Address" className="sm:col-span-2">
                <input className={inputClass} value={loc.address} onChange={(e) => setLoc({ address: e.target.value })} />
              </Field>
            </>
          )}
          <Field label="Neighbourhood">
            <input className={inputClass} list="areas" value={place.neighborhood} onChange={(e) => set("neighborhood", e.target.value)} />
          </Field>
          <Field label="City">
            <input className={inputClass} value={place.city} onChange={(e) => set("city", e.target.value)} />
          </Field>
          <Field label="Opening hours" hint={hoursHint(place.hours)}>
            <input className={inputClass} value={place.hours ?? ""} placeholder="9:00am - 8:30pm" onChange={(e) => set("hours", e.target.value)} />
          </Field>
          <Field label="Date added">
            <input className={inputClass} type="date" value={place.addedAt} onChange={(e) => set("addedAt", e.target.value)} />
          </Field>
          <Field label="Instagram URL">
            <input className={inputClass} type="url" value={place.instagram ?? ""} onChange={(e) => set("instagram", e.target.value)} />
          </Field>
          <Field label="Website / online store URL">
            <input className={inputClass} type="url" value={place.website ?? ""} onChange={(e) => set("website", e.target.value)} />
          </Field>
        </div>
      </Panel>

      <Panel
        title={itemLabel}
        action={<GhostButton onClick={() => set("signature", [...place.signature, { name: "", price: 0 }])}>+ Add</GhostButton>}
      >
        <ItemRows items={place.signature} withDescription onChange={(items) => set("signature", items)} />
      </Panel>

      {place.category !== "shop" && (
        <Panel
          title="Menu"
          action={<GhostButton onClick={() => set("menu", [...place.menu, { title: "", items: [] }])}>+ Add section</GhostButton>}
        >
          <div className="space-y-6">
            {place.menu.length === 0 && <p className="text-sm text-muted">No menu sections yet.</p>}
            {place.menu.map((section, i) => {
              const update = (s: MenuSection) => set("menu", place.menu.map((m, j) => (j === i ? s : m)));
              return (
                <div key={i} className="border-l-2 border-line pl-4">
                  <div className="flex gap-2">
                    <input
                      className={`${inputClass} font-medium`}
                      placeholder="Section title, e.g. Coffee"
                      value={section.title}
                      onChange={(e) => update({ ...section, title: e.target.value })}
                    />
                    <GhostButton onClick={() => set("menu", place.menu.filter((_, j) => j !== i))}>Remove</GhostButton>
                  </div>
                  <div className="mt-3">
                    <ItemRows items={section.items} withVeg onChange={(items) => update({ ...section, items })} />
                    <GhostButton className="mt-2" onClick={() => update({ ...section, items: [...section.items, { name: "", price: 0 }] })}>
                      + Add item
                    </GhostButton>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      )}

      <div className="sticky bottom-0 -mx-4 flex items-center justify-between gap-4 border-t border-line bg-surface/95 px-4 py-4 backdrop-blur sm:mx-0 sm:px-0">
        <div className="flex gap-3">
          <SubmitButton>{isNew ? "Create place" : "Save changes"}</SubmitButton>
          {!isNew && (
            <a href={`/places/${place.slug}`} target="_blank" className="self-center text-sm text-muted underline hover:text-ink">
              View ↗
            </a>
          )}
        </div>
        {!isNew && (
          <DeleteButton
            confirmText={`Delete “${place.name}”? This can't be undone.`}
            action={() => deletePlace(initial.slug)}
          />
        )}
      </div>
    </form>
  );
}

function ItemRows({
  items,
  onChange,
  withDescription,
  withVeg,
}: {
  items: MenuItem[];
  onChange: (items: MenuItem[]) => void;
  withDescription?: boolean;
  withVeg?: boolean;
}) {
  const update = (i: number, patch: Partial<MenuItem>) => onChange(items.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  if (items.length === 0 && withDescription) return <p className="text-sm text-muted">Nothing added yet.</p>;
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
          <input className={`${inputClass} sm:flex-[2]`} placeholder="Name" value={item.name} onChange={(e) => update(i, { name: e.target.value })} />
          {withDescription && (
            <input
              className={`${inputClass} sm:flex-[3]`}
              placeholder="Short description (optional)"
              value={item.description ?? ""}
              onChange={(e) => update(i, { description: e.target.value || undefined })}
            />
          )}
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted">Rs</span>
            <input
              className={`${inputClass} w-24`}
              type="number"
              min={0}
              value={item.price || ""}
              onChange={(e) => update(i, { price: Number(e.target.value) })}
            />
          </div>
          {withVeg && (
            <label className="flex items-center gap-1 text-xs text-muted">
              <input type="checkbox" checked={!!item.veg} onChange={(e) => update(i, { veg: e.target.checked || undefined })} />
              Veg
            </label>
          )}
          <GhostButton onClick={() => onChange(items.filter((_, j) => j !== i))}>✕</GhostButton>
        </div>
      ))}
    </div>
  );
}

function move<T>(xs: T[], from: number, to: number) {
  const copy = [...xs];
  const [x] = copy.splice(from, 1);
  copy.splice(to, 0, x);
  return copy;
}
