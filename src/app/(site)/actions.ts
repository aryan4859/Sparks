"use server";

import { after } from "next/server";
import { sendConfirmation, sendWelcome } from "@/lib/newsletter";
import { clientIp, rateLimited } from "@/lib/rate-limit";
import { publicClient } from "@/lib/supabase/clients";
import { cleanHttpUrl, coordsFromMapsLink } from "@/lib/validate";

export type SubscribeState = { ok?: boolean; error?: string; email?: string } | undefined;

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function subscribe(_: SubscribeState, formData: FormData): Promise<SubscribeState> {
  // Honeypot: real visitors never see or fill this field.
  if (formData.get("website")) return { ok: true };

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!EMAIL.test(email) || email.length > 254) return { error: "That doesn't look like an email address.", email };
  if (rateLimited(`subscribe:${await clientIp()}`, 5, 60 * 60 * 1000)) {
    return { error: "Too many sign-ups from your connection — please try again in an hour.", email };
  }

  // Returns a token only when a confirmation email should go out (new, returning,
  // or still unconfirmed after an hour), so the form can't be used to spam an address.
  const { data: token, error } = await publicClient().rpc("subscribe", { p_email: email });
  if (error) {
    console.error("subscribe:", error.message);
    return { error: "Something went wrong — please try again.", email };
  }
  if (token) after(() => sendConfirmation({ email, token }));
  return { ok: true };
}

/** Confirms a sign-up from the email link; the first time, sends the welcome email. */
export async function confirmSubscription(_: ConfirmState, formData: FormData): Promise<ConfirmState> {
  const token = String(formData.get("token") ?? "");
  if (!UUID.test(token)) return "invalid";
  const { data, error } = await publicClient().rpc("confirm_subscription", { p_token: token });
  if (error) {
    console.error("confirmSubscription:", error.message);
    return "error";
  }
  const result = data as { status: "confirmed" | "already" | "invalid"; email?: string };
  if (result.status === "confirmed" && result.email) {
    const email = result.email;
    after(() => sendWelcome({ email, token }));
  }
  return result.status;
}

export type ConfirmState = "confirmed" | "already" | "invalid" | "error" | "offline" | undefined;

/** True if the token belongs to a subscriber (now unsubscribed). */
export async function unsubscribeToken(token: string) {
  if (!UUID.test(token)) return false;
  const { data, error } = await publicClient().rpc("unsubscribe", { p_token: token });
  if (error) throw new Error(`Supabase: ${error.message}`);
  return data === true;
}

export async function unsubscribe(_: boolean | undefined, formData: FormData) {
  return unsubscribeToken(String(formData.get("token") ?? ""));
}

// ─── Suggest a place ─────────────────────────────────────────────────────

/** On an error the typed values come back, because React clears a form after each submit. */
export type SuggestState =
  | { ok?: boolean; error?: string; values?: { name: string; category: string; area: string; maps_link: string; note: string } }
  | undefined;

/** Trims, collapses runs of whitespace and drops control characters; emoji and Nepali text are kept. */
const clean = (v: FormDataEntryValue | null, multiline = false) =>
  String(v ?? "")
    .replace(/\r\n?/g, "\n") // browsers submit textarea line breaks as \r\n
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(multiline ? /[^\S\n]+/g : /\s+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

export async function suggestPlace(_: SuggestState, formData: FormData): Promise<SuggestState> {
  if (formData.get("website")) return { ok: true }; // honeypot

  const name = clean(formData.get("name"));
  const category = String(formData.get("category") ?? "");
  const area = clean(formData.get("area"));
  const rawLink = clean(formData.get("maps_link"));
  const note = clean(formData.get("note"), true);
  const values = { name, category, area, maps_link: rawLink, note };
  const fail = (error: string): SuggestState => ({ error, values });

  if (!name) return fail("What's the place called?");
  if (name.length > 120 || area.length > 120) return fail("That name or area is too long.");
  if (!["cafe", "restaurant", "shop"].includes(category)) return fail("Pick café, restaurant or shop.");
  if (note.length > 1000) return fail("Please keep the note under 1,000 characters.");
  // A Google Maps link, any web link, or bare coordinates like "27.67, 85.32".
  const link = coordsFromMapsLink(rawLink) && !/^https?:/i.test(rawLink) ? rawLink : cleanHttpUrl(rawLink);
  if (link === null || (link && link.length > 600)) return fail("The map link doesn't look right — paste the Google Maps link, or leave it empty.");

  if (rateLimited(`suggest:${await clientIp()}`, 5, 60 * 60 * 1000)) {
    return fail("Thanks for all the suggestions! Please try again in an hour.");
  }
  const { data: accepted, error } = await publicClient().rpc("suggest_place", {
    p_name: name,
    p_category: category,
    p_area: area,
    p_maps_link: link ?? "",
    p_note: note,
  });
  if (error) {
    console.error("suggestPlace:", error.message);
    return fail("Something went wrong — please try again.");
  }
  if (!accepted) return fail("We're getting a lot of suggestions right now — please try again later.");
  return { ok: true };
}
