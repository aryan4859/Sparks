/** Input checks shared by the admin forms (browser) and server actions. */

/**
 * Normalises a link typed into a form. Blank → undefined, anything that isn't an
 * http(s) URL → null. "www.example.com" is accepted and gets https:// added.
 */
export function cleanHttpUrl(v: string | undefined | null): string | undefined | null {
  const s = v?.trim();
  if (!s) return undefined;
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(s) ? s : `https://${s}`);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}

/**
 * Whether next/image may load this URL. Keep in sync with images.remotePatterns in
 * next.config.ts — an image from any other host makes the page fail to render.
 */
export function isAllowedImage(src: string) {
  try {
    const url = new URL(src);
    if (url.protocol !== "https:") return false;
    if (url.hostname.endsWith(".supabase.co")) return url.pathname.startsWith("/storage/v1/object/public/");
    return url.hostname === "res.cloudinary.com";
  } catch {
    return false;
  }
}
