"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { OFFLINE } from "@/lib/safe-action";
import { RichText } from "./PostBlocks";

/**
 * "Ask Sparks": a small chat in the corner of the public site. Questions go to
 * /api/assistant, which answers from the guide's published places only.
 */
type Message = { role: "user" | "assistant"; content: string; error?: boolean };

const SUGGESTIONS = ["A quiet café with Wi-Fi", "Where's open right now?", "Somewhere nice for a date", "Best spots in Patan"];

/** The model writes light Markdown: paragraphs, "- " bullet lists, **bold**, *italic*, [links](/places/…). */
function Answer({ text }: { text: string }) {
  return (
    <>
      {text
        .trim()
        .split(/\n{2,}/)
        .map((block, i) => {
          const lines = block.split("\n").filter((l) => l.trim());
          const bullets = lines.length > 0 && lines.every((l) => /^\s*([-*•]|\d+[.)])\s+/.test(l));
          if (bullets) {
            return (
              <ul key={i} className="list-disc space-y-1 pl-5">
                {lines.map((l, j) => (
                  <li key={j}>
                    <RichText text={l.replace(/^\s*([-*•]|\d+[.)])\s+/, "")} />
                  </li>
                ))}
              </ul>
            );
          }
          return (
            <p key={i}>
              <RichText text={lines.join(" ")} />
            </p>
          );
        })}
    </>
  );
}

function SparkIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8z" />
      <path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z" opacity=".7" />
    </svg>
  );
}

export function AssistantChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Keep the newest message in view as the answer streams in.
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  async function ask(question: string) {
    const q = question.trim().slice(0, 1000);
    if (!q || busy) return;
    const history = [...messages.filter((m) => !m.error), { role: "user" as const, content: q }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);
    const controller = new AbortController();
    abort.current = controller;
    const update = (content: string, error = false) =>
      setMessages((all) => [...all.slice(0, -1), { role: "assistant", content, error }]);

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history.map(({ role, content }) => ({ role, content })) }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        update((await res.text().catch(() => "")) || "Ask Sparks couldn't answer just now — please try again.", true);
        return;
      }
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let answer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        answer += value;
        update(answer);
      }
      if (!answer.trim()) update("Sorry, I couldn't come up with an answer — please try asking another way.", true);
    } catch (e) {
      if ((e as Error).name !== "AbortError") update(OFFLINE, true);
    } finally {
      setBusy(false);
      abort.current = null;
    }
  }

  function newChat() {
    abort.current?.abort();
    setMessages([]);
    setBusy(false);
    inputRef.current?.focus();
  }

  /** Links to places open in the site without reloading, so the conversation stays. */
  function onLinkClick(e: React.MouseEvent) {
    const a = (e.target as HTMLElement).closest("a");
    const href = a?.getAttribute("href");
    if (!href?.startsWith("/") || href.startsWith("//") || e.metaKey || e.ctrlKey) return;
    e.preventDefault();
    router.push(href);
    if (!matchMedia("(min-width: 640px)").matches) setOpen(false); // on phones the chat covers the page
  }

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={false}
          className="fixed bottom-4 right-4 z-[1600] flex items-center gap-2 rounded-full bg-ink px-4 py-3 text-sm text-paper shadow-lg transition hover:opacity-90 sm:bottom-6 sm:right-6"
        >
          <SparkIcon />
          Ask Sparks
        </button>
      )}

      {open && (
        <div
          role="dialog"
          aria-label="Ask Sparks"
          className="fixed inset-x-2 bottom-2 z-[1600] flex h-[min(600px,calc(100dvh-5rem))] flex-col border border-line bg-paper shadow-2xl sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[390px]"
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="flex items-center gap-2 font-semibold tracking-tight">
              <SparkIcon /> Ask <span className="font-serif font-normal italic">Sparks</span>
            </p>
            <div className="flex items-center gap-3 text-xs text-muted">
              {messages.length > 0 && (
                <button type="button" onClick={newChat} className="hover:text-ink">New chat</button>
              )}
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="text-lg leading-none hover:text-ink">
                ✕
              </button>
            </div>
          </div>

          <div ref={listRef} onClick={onLinkClick} className="flex-1 space-y-4 overflow-y-auto px-4 py-4 text-sm leading-relaxed">
            {messages.length === 0 && (
              <div>
                <p>
                  Hi! Ask me where to go — a quiet café, a good momo spot, somewhere open right now. I answer from the places
                  handpicked on Sparks.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => ask(s)}
                      className="rounded-full border border-line px-3 py-1.5 text-xs text-muted transition hover:border-ink hover:text-ink"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) =>
              m.role === "user" ? (
                <p key={i} className="ml-8 bg-ink px-3 py-2 text-paper">{m.content}</p>
              ) : (
                <div key={i} className={`mr-4 space-y-2 ${m.error ? "text-danger" : ""}`} aria-live="polite">
                  {m.content ? <Answer text={m.content} /> : <p className="animate-pulse text-muted">Thinking…</p>}
                </div>
              ),
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              ask(input);
            }}
            className="border-t border-line p-3"
          >
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    ask(input);
                  }
                }}
                rows={1}
                maxLength={1000}
                placeholder="Ask about places…"
                aria-label="Your question"
                className="max-h-28 min-h-10 flex-1 resize-none border border-line bg-transparent px-3 py-2 text-sm outline-none focus:border-ink"
              />
              <button disabled={busy || !input.trim()} className="bg-ink px-4 py-2 text-sm text-paper hover:opacity-85 disabled:opacity-40">
                {busy ? "…" : "Send"}
              </button>
            </div>
            <p className="mt-2 text-[11px] leading-snug text-muted">
              AI answers can be wrong — check before you go. Don&apos;t share personal details.
            </p>
          </form>
        </div>
      )}
    </>
  );
}
