import "server-only";
import { headers } from "next/headers";

/**
 * Simple in-memory sliding-window limiter. It's per server process, so on
 * serverless hosting each instance counts separately: a speed bump against
 * scripted abuse, not a hard guarantee. Hard caps live in the database.
 */
const hits = new Map<string, number[]>();

export function rateLimited(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  const limited = recent.length >= max;
  if (!limited) recent.push(now);
  hits.set(key, recent);
  // Keep memory bounded.
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k);
  return limited;
}

/** The visitor's IP as reported by the hosting proxy (Vercel, Cloudflare, nginx). */
export async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "unknown";
}
