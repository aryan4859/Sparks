"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { browserClient } from "@/lib/supabase/browser";

const MAX_EDGE = 2000;

/** Downscale to MAX_EDGE px and re-encode as WebP — phone photos shrink ~10×. */
async function compress(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not encode image"))), "image/webp", 0.85),
  );
}

export async function uploadImage(file: File, folder: string) {
  const blob = await compress(file);
  const base = file.name.replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
  const path = `${folder}/${Date.now()}-${base || "photo"}.webp`;
  const supabase = browserClient();
  const { error } = await supabase.storage.from("media").upload(path, blob, {
    contentType: "image/webp",
    cacheControl: "31536000",
  });
  if (error) throw error;
  return supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
}

export function ImageUpload({
  value,
  onChange,
  folder,
  aspect = "aspect-[4/5]",
  label = "Upload photo",
}: {
  value: string;
  onChange: (url: string) => void;
  folder: string;
  aspect?: string;
  label?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function handle(file?: File) {
    if (!file) return;
    setBusy(true);
    setError(undefined);
    try {
      onChange(await uploadImage(file, folder));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handle(e.dataTransfer.files[0]);
        }}
        className={`group relative flex w-full items-center justify-center overflow-hidden border border-dashed border-line bg-card/60 text-xs text-muted hover:border-ink ${aspect}`}
      >
        {value ? (
          <>
            <Image src={value} alt="" fill sizes="300px" className="object-cover" />
            <span className="absolute inset-x-0 bottom-0 bg-black/50 py-1.5 text-white opacity-0 transition group-hover:opacity-100">
              Replace
            </span>
          </>
        ) : (
          <span>{busy ? "Uploading…" : label}</span>
        )}
        {busy && value && <span className="absolute inset-0 flex items-center justify-center bg-paper/70">Uploading…</span>}
      </button>
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => handle(e.target.files?.[0])} />
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}
