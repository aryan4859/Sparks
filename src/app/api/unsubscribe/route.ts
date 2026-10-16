import type { NextRequest } from "next/server";
import { unsubscribeToken } from "@/app/(site)/actions";

/**
 * One-click unsubscribe (RFC 8058): mail apps POST here from the List-Unsubscribe
 * header. It's POST-only, so link scanners that prefetch URLs can't unsubscribe anyone.
 */
export async function POST(request: NextRequest) {
  const ok = await unsubscribeToken(request.nextUrl.searchParams.get("token") ?? "");
  return new Response(null, { status: ok ? 200 : 404 });
}
