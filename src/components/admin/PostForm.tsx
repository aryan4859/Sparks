"use client";

import { slugify } from "@/lib/validate";
import { useActionState, useRef, useState } from "react";
import { deletePost, savePost } from "@/app/admin/actions";
import type { Post } from "@/lib/types";
import { ImageUpload, uploadImage } from "./ImageUpload";
import { type Newsletter, NewsletterOption } from "./NewsletterOption";
import { DeleteButton, ErrorNote, Field, GhostButton, inputClass, Panel, SubmitButton, UploadsProvider, useUploads } from "./ui";
import { OFFLINE, withNetworkError } from "@/lib/safe-action";

const savePostAction = withNetworkError(savePost, () => ({ error: OFFLINE }));

/** The form, inside an UploadsProvider so saving waits for photo uploads. */
export function PostForm(props: React.ComponentProps<typeof PostFormFields>) {
  return (
    <UploadsProvider>
      <PostFormFields {...props} />
    </UploadsProvider>
  );
}

function PostFormFields({
  initial,
  isNew,
  places,
  newsletter,
}: {
  initial: Post;
  isNew: boolean;
  places: { slug: string; name: string }[];
  newsletter: Newsletter;
}) {
  const [post, setPost] = useState(initial);
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [uploading, setUploading] = useState(false);
  const { track } = useUploads();
  // Default on for stories that haven't been published yet; opt-in for older ones.
  const [notify, setNotify] = useState(initial.published === false || isNew);
  const [state, action] = useActionState(savePostAction, undefined);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof Post>(key: K, value: Post[K]) => setPost((p) => ({ ...p, [key]: value }));

  /** Insert a block at the cursor, padded with blank lines so it becomes its own paragraph. */
  function insertBlock(text: string) {
    const el = bodyRef.current;
    const at = el?.selectionStart ?? post.body.length;
    const before = post.body.slice(0, at).replace(/\s*$/, "");
    const after = post.body.slice(at).replace(/^\s*/, "");
    const body = [before, text, after].filter(Boolean).join("\n\n");
    set("body", body);
    requestAnimationFrame(() => {
      const pos = (before ? before.length + 2 : 0) + text.length;
      el?.focus();
      el?.setSelectionRange(pos, pos);
    });
  }

  async function insertImage(file?: File) {
    if (!file || uploading) return;
    setUploading(true);
    try {
      const url = await track(uploadImage(file, `posts/${post.slug || "new"}`));
      insertBlock(`![Caption](${url})`);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="isNew" value={isNew ? "1" : "0"} />
      <input type="hidden" name="cover" value={post.cover} />
      <input type="hidden" name="slug" value={post.slug} />
      <ErrorNote message={state?.error} />

      <Panel title="Story">
        <div className="grid gap-5 sm:grid-cols-[1fr_220px]">
          <div className="space-y-5">
            <Field label="Title">
              <input
                name="title"
                required
                className={`${inputClass} text-lg`}
                value={post.title}
                onChange={(e) => {
                  const title = e.target.value;
                  setPost((p) => ({ ...p, title, slug: slugTouched ? p.slug : slugify(title) }));
                }}
              />
            </Field>
            <Field label="URL slug" hint={isNew ? `/journal/${post.slug || "…"}` : "Can't be changed after creation"}>
              <input
                className={inputClass}
                value={post.slug}
                disabled={!isNew}
                onChange={(e) => {
                  setSlugTouched(true);
                  set("slug", slugify(e.target.value));
                }}
              />
            </Field>
            <Field label="Excerpt" hint="One or two sentences for cards and search results">
              <textarea name="excerpt" className={`${inputClass} min-h-20`} value={post.excerpt} onChange={(e) => set("excerpt", e.target.value)} />
            </Field>
            <div className="flex flex-wrap items-end gap-6">
              <Field label="Date">
                <input name="date" type="date" className={inputClass} value={post.date} onChange={(e) => set("date", e.target.value)} />
              </Field>
              <label className="flex items-center gap-2 pb-2 text-sm">
                <input name="published" type="checkbox" checked={post.published !== false} onChange={(e) => set("published", e.target.checked)} />
                Published
              </label>
            </div>
            <NewsletterOption
              newsletter={newsletter}
              published={post.published !== false}
              checked={notify}
              onChange={setNotify}
            />
          </div>
          <Field label="Cover photo">
            <ImageUpload value={post.cover} onChange={(url) => set("cover", url)} folder={`posts/${post.slug || "new"}`} aspect="aspect-[3/2]" />
          </Field>
        </div>
      </Panel>

      <Panel title="Body">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <GhostButton onClick={() => insertBlock("## Heading")}>+ Heading</GhostButton>
          <GhostButton disabled={uploading} onClick={() => fileRef.current?.click()}>
            {uploading ? "Uploading…" : "+ Photo"}
          </GhostButton>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => insertImage(e.target.files?.[0])} />
          <select
            className="border border-line bg-field px-2 py-1.5 text-xs text-muted"
            value=""
            onChange={(e) => e.target.value && insertBlock(`[[place:${e.target.value}]]`)}
          >
            <option value="">+ Embed a place…</option>
            {places.map((p) => (
              <option key={p.slug} value={p.slug}>{p.name}</option>
            ))}
          </select>
        </div>
        <textarea
          ref={bodyRef}
          name="body"
          className={`${inputClass} min-h-[28rem] font-mono text-[13px] leading-relaxed`}
          value={post.body}
          onChange={(e) => set("body", e.target.value)}
        />
        <p className="mt-2 text-xs text-muted">
          Leave a blank line between paragraphs. <code>## Heading</code> · <code>![Caption](image-url)</code> ·{" "}
          <code>[[place:slug]]</code> embeds a place card.
        </p>
      </Panel>

      <div className="sticky bottom-0 -mx-4 flex items-center justify-between gap-4 border-t border-line bg-surface/95 px-4 py-4 backdrop-blur sm:mx-0 sm:px-0">
        <div className="flex gap-3">
          <SubmitButton>{isNew ? "Publish story" : "Save changes"}</SubmitButton>
          {!isNew && (
            <a href={`/journal/${post.slug}`} target="_blank" className="self-center text-sm text-muted underline hover:text-ink">
              View ↗
            </a>
          )}
        </div>
        {!isNew && (
          <DeleteButton
            confirmText={`Delete “${post.title}”? This can't be undone.`}
            action={() => deletePost(post.slug)}
          />
        )}
      </div>
    </form>
  );
}
