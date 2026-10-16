"use server";

import { after } from "next/server";
import { sendWelcome } from "@/lib/newsletter";
import { clientIp, rateLimited } from "@/lib/rate-limit";
import { publicClient } from "@/lib/supabase/clients";

export type SubscribeState = { ok?: boolean; error?: string } | undefined;

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function subscribe(_: SubscribeState, formData: FormData): Promise<SubscribeState> {
  // Honeypot: real visitors never see or fill this field.
  if (formData.get("website")) return { ok: true };

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!EMAIL.test(email) || email.length > 254) return { error: "That doesn't look like an email address." };
  if (rateLimited(`subscribe:${await clientIp()}`, 5, 60 * 60 * 1000)) {
    return { error: "Too many sign-ups from your connection — please try again in an hour." };
  }

  // Returns the unsubscribe token only for new (or returning) subscribers, so
  // submitting the same address again can't trigger another welcome email.
  const { data: token, error } = await publicClient().rpc("subscribe", { p_email: email });
  if (error) {
    console.error("subscribe:", error.message);
    return { error: "Something went wrong — please try again." };
  }
  if (token) after(() => sendWelcome({ email, token }));
  return { ok: true };
}

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
