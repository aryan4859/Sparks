import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { parsePostBody } from "./markdown";

/**
 * Finds uploaded photos that nothing uses any more (replaced covers, removed
 * gallery photos, deleted places), so they can be cleaned up before storage
 * reaches the free plan's 1 GB. Needs an admin session.
 */
export type MediaFile = { path: string; size: number; createdAt: string; url: string };

const BUCKET = "media";
const MARKER = `/storage/v1/object/public/${BUCKET}/`;
/** Never touch recent uploads: they may belong to a form that hasn't been saved yet. */
const GRACE_MS = 24 * 60 * 60 * 1000;

async function listAll(supabase: SupabaseClient, prefix = ""): Promise<MediaFile[]> {
  const files: MediaFile[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.storage.from(BUCKET).list(prefix, { limit: 1000, offset });
    if (error) throw new Error(`Couldn't list photos: ${error.message}`);
    for (const item of data) {
      const path = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id === null) {
        files.push(...(await listAll(supabase, path))); // a folder
      } else {
        files.push({
          path,
          size: Number(item.metadata?.size ?? 0),
          createdAt: item.created_at ?? new Date().toISOString(), // unknown age counts as new: kept
          url: supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl,
        });
      }
    }
    if (data.length < 1000) return files;
  }
}

/** Storage paths of every photo a place, story, list or area page uses. */
async function usedPaths(supabase: SupabaseClient) {
  const [places, posts, lists, areas] = await Promise.all([
    supabase.from("places").select("cover, gallery").returns<{ cover: string; gallery: string[] }[]>(),
    supabase.from("posts").select("cover, body").returns<{ cover: string; body: string }[]>(),
    supabase.from("lists").select("cover").returns<{ cover: string }[]>(),
    supabase.from("areas").select("cover").returns<{ cover: string }[]>(),
  ]);
  for (const r of [places, posts, lists, areas]) if (r.error) throw new Error(`Couldn't read what's in use: ${r.error.message}`);

  const urls = [
    ...places.data!.flatMap((p) => [p.cover, ...(p.gallery ?? [])]),
    ...posts.data!.flatMap((p) => [p.cover, ...parsePostBody(p.body).flatMap((b) => (b.type === "img" ? [b.src] : []))]),
    ...lists.data!.map((l) => l.cover),
    ...areas.data!.map((a) => a.cover),
  ];
  const paths = new Set<string>();
  for (const url of urls) {
    const i = url?.indexOf(MARKER) ?? -1;
    if (i >= 0) paths.add(decodeURIComponent(url.slice(i + MARKER.length).split("?")[0]));
  }
  return paths;
}

export async function findUnusedMedia(supabase: SupabaseClient) {
  const [files, used] = await Promise.all([listAll(supabase), usedPaths(supabase)]);
  const cutoff = Date.now() - GRACE_MS;
  const unused = files.filter((f) => !used.has(f.path) && new Date(f.createdAt).getTime() < cutoff);
  return {
    totalCount: files.length,
    totalBytes: files.reduce((s, f) => s + f.size, 0),
    unused,
    unusedBytes: unused.reduce((s, f) => s + f.size, 0),
  };
}

/** Deletes every unused photo (worked out again here, never from the browser's list). */
export async function deleteUnusedMedia(supabase: SupabaseClient) {
  const { unused } = await findUnusedMedia(supabase);
  let deleted = 0;
  for (let i = 0; i < unused.length; i += 100) {
    const batch = unused.slice(i, i + 100).map((f) => f.path);
    const { error } = await supabase.storage.from(BUCKET).remove(batch);
    if (error) return { deleted, error: error.message };
    deleted += batch.length;
  }
  return { deleted };
}
