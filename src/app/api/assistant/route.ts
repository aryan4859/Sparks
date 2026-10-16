import type { NextRequest } from "next/server";
import { AssistantError, assistantReady, type ChatMessage, LIMITS, streamAnswer } from "@/lib/assistant";
import { clientIp, rateLimited } from "@/lib/rate-limit";

/**
 * POST { messages: [{ role, content }, …] } → the answer, streamed as plain text.
 * Guarded so it can't be used as a free general-purpose AI: same-site requests
 * only, per-visitor limits, short conversations, and the system prompt keeps it
 * to Sparks. OpenRouter's own free-tier limits apply on top.
 */
export const maxDuration = 60;

const text = (body: string, status: number) =>
  new Response(body, { status, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });

export async function POST(request: NextRequest) {
  if (!assistantReady) return text("The assistant isn't set up yet.", 503);

  // Only the site's own pages may call this (browsers always send Origin on POST).
  const origin = request.headers.get("origin");
  try {
    if (!origin || new URL(origin).host !== request.headers.get("host")) return text("Forbidden", 403);
  } catch {
    return text("Forbidden", 403);
  }

  const ip = await clientIp();
  if (rateLimited(`assistant-min:${ip}`, 5, 60 * 1000) || rateLimited(`assistant:${ip}`, 20, 60 * 60 * 1000)) {
    return text("You've asked a lot of questions — please try again a little later.", 429);
  }

  let messages: ChatMessage[];
  try {
    const body = await request.json();
    if (!Array.isArray(body?.messages)) throw new Error();
    messages = body.messages
      .slice(-LIMITS.turns)
      .map((m: unknown) => {
        const { role, content } = (m ?? {}) as Partial<ChatMessage>;
        if ((role !== "user" && role !== "assistant") || typeof content !== "string") throw new Error();
        const max = role === "user" ? LIMITS.userChars : LIMITS.assistantChars;
        return { role, content: content.trim().slice(0, max) };
      })
      .filter((m: ChatMessage) => m.content);
    if (!messages.length || messages.at(-1)!.role !== "user") throw new Error();
  } catch {
    return text("Bad request", 400);
  }

  try {
    const stream = await streamAnswer(messages);
    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
    });
  } catch (e) {
    console.error("assistant:", e instanceof Error ? e.message : e);
    if (e instanceof AssistantError && e.status === 429) {
      return text("Ask Sparks is very busy right now — please try again later, or browse the map.", 429);
    }
    return text("Ask Sparks couldn't answer just now — please try again.", 502);
  }
}
