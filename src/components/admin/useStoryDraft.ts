"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { Post } from "@/lib/types";

/**
 * Autosave for the story editor: unsaved edits are kept in this browser, offered
 * back ("Restore") if the tab was closed before saving, and the browser warns
 * before leaving the page with unsaved edits.
 */
type Draft = Pick<Post, "title" | "excerpt" | "body" | "cover"> & { savedAt: number };

const FIELDS = ["title", "excerpt", "body", "cover"] as const;
const same = (a: Partial<Post>, b: Partial<Post>) => FIELDS.every((f) => (a[f] ?? "") === (b[f] ?? ""));

const store = {
  get: (key: string) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set: (key: string, post: Post) => {
    try {
      const draft: Draft = { title: post.title, excerpt: post.excerpt, body: post.body, cover: post.cover, savedAt: Date.now() };
      localStorage.setItem(key, JSON.stringify(draft));
    } catch {}
  },
  remove: (key: string) => {
    try {
      localStorage.removeItem(key);
    } catch {}
  },
};

// What was stored when the editor opened, read once per visit (later autosaves don't change it).
const opened = new Map<string, string | null>();
const noSubscribe = () => () => {};

export function useStoryDraft(slug: string, post: Post, initial: Post) {
  const key = `sparks-story:${slug || "new"}`;
  const raw = useSyncExternalStore(
    noSubscribe,
    () => {
      if (!opened.has(key)) opened.set(key, store.get(key));
      return opened.get(key) ?? null;
    },
    () => null,
  );
  const stored = useMemo<Draft | null>(() => {
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, [raw]);
  const [dismissed, setDismissed] = useState(false);
  const submitting = useRef(false);
  const dirty = !same(post, initial);

  // Re-read on the next visit to the editor.
  useEffect(() => () => void opened.delete(key), [key]);

  // A stored draft identical to the saved story is left over from a successful save.
  useEffect(() => {
    if (stored && same(stored, initial)) store.remove(key);
  }, [stored, initial, key]);

  // Autosave a moment after typing stops.
  useEffect(() => {
    if (!dirty || submitting.current) return;
    const timer = setTimeout(() => store.set(key, post), 800);
    return () => clearTimeout(timer);
  }, [key, post, dirty]);

  // Warn before closing or reloading the tab with unsaved edits.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      if (!submitting.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const offer = !dismissed && stored && !same(stored, initial) && !same(stored, post) ? stored : null;
  return {
    /** A draft from an earlier visit that differs from both the saved story and what's on screen. */
    offer,
    dismiss: useCallback(() => setDismissed(true), []),
    discard: useCallback(() => {
      store.remove(key);
      setDismissed(true);
    }, [key]),
    /** Call when the form is submitted: stop autosaving and forget the draft. */
    submitted: useCallback(() => {
      submitting.current = true;
      store.remove(key);
    }, [key]),
    /** Call if saving failed: keep the edits safe again. */
    failed: useCallback(
      (current: Post) => {
        submitting.current = false;
        store.set(key, current);
      },
      [key],
    ),
  };
}
