"use client";

import { useState, useSyncExternalStore } from "react";

const noSubscribe = () => () => {};

/**
 * Share a place or story: WhatsApp, Viber (phones), Facebook, copy link, and the
 * phone's own share sheet where available. Plain links, no tracking scripts.
 */
export function ShareButtons({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  // Only known in the browser (false while pre-rendering): a native share sheet, and a phone (for Viber).
  const nativeShare = useSyncExternalStore(noSubscribe, () => typeof navigator.share === "function", () => false);
  const phone = useSyncExternalStore(noSubscribe, () => matchMedia("(pointer: coarse)").matches, () => false);

  const text = encodeURIComponent(`${title} ${url}`);
  const chip = "whitespace-nowrap rounded-full border border-line px-3 py-1.5 text-xs text-muted transition hover:border-ink hover:text-ink";

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link:", url); // clipboard blocked (e.g. insecure context)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="label mr-1 text-muted">Share</span>
      {nativeShare && (
        <button type="button" className={chip} onClick={() => navigator.share({ title, url }).catch(() => {})}>
          Share…
        </button>
      )}
      <a className={chip} href={`https://wa.me/?text=${text}`} target="_blank" rel="noreferrer">WhatsApp</a>
      {phone && <a className={chip} href={`viber://forward?text=${text}`}>Viber</a>}
      <a className={chip} href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`} target="_blank" rel="noreferrer">
        Facebook
      </a>
      <button type="button" className={chip} onClick={copy} aria-live="polite">
        {copied ? "Copied ✓" : "Copy link"}
      </button>
    </div>
  );
}
