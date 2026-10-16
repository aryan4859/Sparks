"use client";

import { useSyncExternalStore } from "react";

/**
 * Saved places, kept in this browser only (no account). Every ♡ button, the
 * header count and other open tabs stay in sync through one small store.
 */
const KEY = "sparks-saved";
const EMPTY: string[] = [];
const listeners = new Set<() => void>();
let cache: string[] | null = null; // a stable snapshot for useSyncExternalStore

function read(): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(value) ? value.filter((s): s is string => typeof s === "string").slice(0, 200) : [];
  } catch {
    return []; // storage blocked (some private windows) or corrupted
  }
}

function snapshot() {
  return (cache ??= read());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Saved in another tab.
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    cache = null;
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function toggleSaved(slug: string) {
  const current = snapshot();
  // Newest first. If storage is blocked, it still works until the page is closed.
  cache = current.includes(slug) ? current.filter((s) => s !== slug) : [slug, ...current];
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {}
  listeners.forEach((l) => l());
}

/** The saved place slugs (empty while pre-rendering). */
export function useSaved() {
  return useSyncExternalStore(subscribe, snapshot, () => EMPTY);
}
