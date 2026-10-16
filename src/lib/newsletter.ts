import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Newsletter } from "@/components/admin/NewsletterOption";
import type { PostRow } from "./db";
import { dbError } from "./supabase/errors";
import { categories, formatDate, site, siteUrl } from "./site";
import type { Place } from "./types";

/**
 * New-story emails, sent from a Gmail account through the Gmail API (plain fetch, no SDK).
 * Needs GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN (run `npm run gmail-auth`),
 * NEWSLETTER_FROM (e.g. "Sparks <you@gmail.com>", the same account) and NEXT_PUBLIC_SITE_URL.
 * A personal Gmail account can send to about 500 recipients a day.
 */
// GOOGLE_* names are accepted too, since that's what Google Cloud calls them.
const env = process.env;
const GMAIL_CLIENT_ID = env.GMAIL_CLIENT_ID || env.GOOGLE_CLIENT_ID;
const GMAIL_CLIENT_SECRET = env.GMAIL_CLIENT_SECRET || env.GOOGLE_CLIENT_SECRET;
const GMAIL_REFRESH_TOKEN = env.GMAIL_REFRESH_TOKEN || env.GOOGLE_REFRESH_TOKEN;
const FROM = process.env.NEWSLETTER_FROM;
const SITE_URL = siteUrl;

export const newsletterReady = Boolean(
  GMAIL_CLIENT_ID && GMAIL_CLIENT_SECRET && GMAIL_REFRESH_TOKEN && FROM && process.env.NEXT_PUBLIC_SITE_URL,
);

type Subscriber = { email: string; token: string };

const PARALLEL = 2; // Gmail allows roughly 2.5 sends per second per account

/** Trades the long-lived refresh token for a one-hour access token. */
async function gmailAccessToken() {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    body: new URLSearchParams({
      client_id: GMAIL_CLIENT_ID!,
      client_secret: GMAIL_CLIENT_SECRET!,
      refresh_token: GMAIL_REFRESH_TOKEN!,
      grant_type: "refresh_token",
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Google sign-in failed: ${json.error_description ?? json.error ?? res.status}`);
  return json.access_token as string;
}

const b64 = (s: string) => Buffer.from(s, "utf8").toString("base64");
/** Base64 wrapped at 76 characters, as MIME requires. */
const b64Lines = (s: string) => b64(s).replace(/.{76}/g, "$&\r\n");

/** A plain-text + HTML email in raw MIME form, which is what the Gmail API sends. */
function mime(to: string, subject: string, html: string, text: string, headers: Record<string, string>) {
  const boundary = `sparks-${crypto.randomUUID()}`;
  return [
    `From: ${FROM}`,
    `To: ${to}`,
    `Subject: =?UTF-8?B?${b64(subject)}?=`,
    ...Object.entries(headers).map(([k, v]) => `${k}: ${v}`),
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    b64Lines(text),
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    b64Lines(html),
    `--${boundary}--`,
    "",
  ].join("\r\n");
}

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export const unsubscribeUrl = (token: string) => `${SITE_URL}/unsubscribe?token=${token}`;

/** The shared email shell: site name, optional cover photo, content, unsubscribe footer. */
function layout(inner: string, unsub: string, cover?: { src: string; href: string }, footer?: string) {
  return `<!doctype html>
<html><body style="margin:0;background:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#111">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff">
<tr><td style="padding:24px 28px;font-weight:600;font-size:18px;letter-spacing:-0.02em">${esc(site.name)}</td></tr>
${cover ? `<tr><td><a href="${cover.href}"><img src="${esc(cover.src)}" alt="" width="560" style="display:block;width:100%;height:auto;border:0"></a></td></tr>` : ""}
<tr><td style="padding:28px">
${inner}
</td></tr>
</table>
<p style="max-width:560px;margin:18px auto 0;font-size:12px;line-height:1.6;color:#888">
${footer ?? `You're getting this because you subscribed at ${esc(SITE_URL.replace(/^https?:\/\//, ""))}.
<a href="${unsub}" style="color:#888">Unsubscribe</a>`}</p>
</td></tr></table>
</body></html>`;
}

const button = (href: string, label: string) =>
  `<a href="${href}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:12px 22px;font-size:14px">${label}</a>`;

function renderPost(post: PostRow, unsub: string) {
  const url = `${SITE_URL}/journal/${post.slug}`;
  const html = layout(
    `<p style="margin:0 0 12px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#777">New in the journal · ${esc(formatDate(post.date))}</p>
<h1 style="margin:0 0 14px;font-size:26px;line-height:1.2;letter-spacing:-0.02em">${esc(post.title)}</h1>
${post.excerpt ? `<p style="margin:0 0 24px;font-family:Georgia,serif;font-style:italic;font-size:18px;line-height:1.5;color:#555">${esc(post.excerpt)}</p>` : ""}
${button(url, "Read the story →")}`,
    unsub,
    post.cover ? { src: post.cover, href: url } : undefined,
  );
  const text = [`New in the ${site.name} journal`, "", post.title, post.excerpt, "", `Read it: ${url}`, "", `Unsubscribe: ${unsub}`];
  return { html, text: text.join("\n") };
}

function renderPlace(place: Place, unsub: string) {
  const url = `${SITE_URL}/places/${place.slug}`;
  const where = [place.neighborhood, place.city].filter(Boolean).join(", ");
  const kind = [categories[place.category].label, place.type].filter((x, i, a) => x && a.indexOf(x) === i).join(" · ");
  const html = layout(
    `<p style="margin:0 0 12px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#777">New on ${esc(site.name)} · ${esc(kind)}</p>
<h1 style="margin:0 0 6px;font-size:26px;line-height:1.2;letter-spacing:-0.02em">${esc(place.name)}</h1>
${where ? `<p style="margin:0 0 14px;font-size:14px;color:#777">${esc(where)}</p>` : ""}
${place.tagline ? `<p style="margin:0 0 24px;font-family:Georgia,serif;font-style:italic;font-size:18px;line-height:1.5;color:#555">${esc(place.tagline)}</p>` : ""}
${button(url, "See the place →")}`,
    unsub,
    place.cover ? { src: place.cover, href: url } : undefined,
  );
  const text = [`New on ${site.name}: ${place.name}`, ...[where, place.tagline].filter(Boolean), "", `See it: ${url}`, "", `Unsubscribe: ${unsub}`];
  return { html, text: text.join("\n") };
}

function renderWelcome(unsub: string) {
  const html = layout(
    `<h1 style="margin:0 0 14px;font-size:26px;line-height:1.2;letter-spacing:-0.02em">You're on the list</h1>
<p style="margin:0 0 24px;font-family:Georgia,serif;font-style:italic;font-size:18px;line-height:1.5;color:#555">Thanks for subscribing. We'll email you whenever a new story goes up in the journal: new openings, quiet corners, no spam.</p>
${button(`${SITE_URL}/journal`, "Read the journal →")}`,
    unsub,
  );
  const text = [
    "You're on the list",
    "",
    `Thanks for subscribing to ${site.name}. We'll email you whenever a new story goes up in the journal.`,
    "",
    `Read the journal: ${SITE_URL}/journal`,
    "",
    `Unsubscribe: ${unsub}`,
  ];
  return { html, text: text.join("\n") };
}

/** Sends one email to one subscriber through the Gmail API. */
async function gmailSend(accessToken: string, to: Subscriber, subject: string, render: (unsub: string) => { html: string; text: string }) {
  const unsub = unsubscribeUrl(to.token);
  const { html, text } = render(unsub);
  const raw = mime(to.email, subject, html, text, {
    // One-click unsubscribe (RFC 8058), required by Gmail and Yahoo for bulk senders.
    "List-Unsubscribe": `<${SITE_URL}/api/unsubscribe?token=${to.token}>, <${unsub}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  });
  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw: Buffer.from(raw).toString("base64url") }),
  });
  if (!res.ok) throw new Error(`Gmail ${res.status}: ${await res.text()}`);
}

export const confirmUrl = (token: string) => `${SITE_URL}/confirm?token=${token}`;

function renderConfirm(confirm: string) {
  const site_ = esc(SITE_URL.replace(/^https?:\/\//, ""));
  const html = layout(
    `<h1 style="margin:0 0 14px;font-size:26px;line-height:1.2;letter-spacing:-0.02em">Confirm your subscription</h1>
<p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#555">One click and you're on the list for new places and stories from ${esc(site.name)}.</p>
${button(confirm, "Yes, subscribe me →")}`,
    confirm,
    undefined,
    `Someone (hopefully you) signed up at ${site_} with this address. If it wasn't you, just ignore this email: you won't hear from us again.`,
  );
  const text = [
    "Confirm your subscription",
    "",
    `One click and you're on the list for new places and stories from ${site.name}:`,
    confirm,
    "",
    "If you didn't sign up, just ignore this email: you won't hear from us again.",
  ].join("\n");
  return { html, text };
}

/** "Please confirm" email for a new sign-up (double opt-in). Never throws; logs failures. */
export async function sendConfirmation(to: Subscriber) {
  if (!newsletterReady) return;
  try {
    await gmailSend(await gmailAccessToken(), to, `Confirm your ${site.name} subscription`, () => renderConfirm(confirmUrl(to.token)));
    console.log(`Newsletter: confirmation email sent to ${to.email}`);
  } catch (e) {
    console.error(`Newsletter: confirmation email to ${to.email} failed — ${e instanceof Error ? e.message : e}`);
  }
}

/** Welcome email, sent once a subscriber confirms. Never throws; logs failures. */
export async function sendWelcome(to: Subscriber) {
  if (!newsletterReady) return;
  try {
    await gmailSend(await gmailAccessToken(), to, `Welcome to ${site.name}`, renderWelcome);
    console.log(`Newsletter: welcome email sent to ${to.email}`);
  } catch (e) {
    console.error(`Newsletter: welcome email to ${to.email} failed — ${e instanceof Error ? e.message : e}`);
  }
}

/** Every active subscriber, paged past PostgREST's 1,000-row limit. Needs an admin session. */
async function activeSubscribers(supabase: SupabaseClient) {
  const all: Subscriber[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("subscribers")
      .select("email, token")
      .is("unsubscribed_at", null)
      .not("confirmed_at", "is", null) // only addresses whose owner confirmed
      .order("created_at")
      .range(from, from + 999)
      .returns<Subscriber[]>();
    if (error) throw new Error(`Couldn't load subscribers: ${error.message}`);
    all.push(...data);
    if (data.length < 1000) return all;
  }
}

type SendResult = { sent: number; error?: string };

/**
 * Emails every active subscriber. Never throws: returns how many were sent,
 * plus an error if it stopped early.
 */
async function sendToAll(
  supabase: SupabaseClient,
  subject: string,
  render: (unsub: string) => { html: string; text: string },
): Promise<SendResult> {
  let sent = 0;
  try {
    if (!newsletterReady) throw new Error("not configured (GMAIL_* settings, NEWSLETTER_FROM, NEXT_PUBLIC_SITE_URL)");
    const [subscribers, token] = await Promise.all([activeSubscribers(supabase), gmailAccessToken()]);

    for (let i = 0; i < subscribers.length; i += PARALLEL) {
      await Promise.all(
        subscribers.slice(i, i + PARALLEL).map(async (s) => {
          await gmailSend(token, s, subject, render);
          sent++;
        }),
      );
      await new Promise((r) => setTimeout(r, 1000));
    }
    return { sent };
  } catch (e) {
    return { sent, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Emails a newly published journal story to every active subscriber. */
export function sendNewPost(supabase: SupabaseClient, post: PostRow) {
  return sendToAll(supabase, post.title, (unsub) => renderPost(post, unsub));
}

/** Emails a newly published place to every active subscriber. */
export function sendNewPlace(supabase: SupabaseClient, place: Place) {
  return sendToAll(supabase, `New on ${site.name}: ${place.name}`, (unsub) => renderPlace(place, unsub));
}

export type NotifyColumns = { notified_at: string | null; notified_count: number | null; notify_error: string | null };

/** What the editor's "Email to N subscribers" option needs to know. Needs an admin session. */
export async function newsletterStatus(supabase: SupabaseClient, row?: NotifyColumns | null): Promise<Newsletter> {
  const { count, error } = await supabase
    .from("subscribers")
    .select("email", { count: "exact", head: true })
    .is("unsubscribed_at", null)
    .not("confirmed_at", "is", null);
  if (error) throw dbError(error);
  return {
    ready: newsletterReady,
    subscribers: count ?? 0,
    emailedAt: row?.notified_at ?? null,
    sentCount: row?.notified_count ?? null,
    error: row?.notify_error ?? null,
  };
}
