import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection } from "@/components/LegalPage";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `What ${site.name} collects, why, and how to have it removed.`,
};

export default function PrivacyPage() {
  const mail = <a href={`mailto:${site.email}`}>{site.email}</a>;
  return (
    <LegalPage
      title="Privacy"
      italic="policy"
      updated="2026-10-16"
      intro={`${site.name} is an independent guide to cafés, restaurants and shops in Nepal, made in Kathmandu. We collect as little about you as we can. This page explains what that is.`}
    >
      <LegalSection title="The short version">
        <ul>
          <li>You can browse {site.name} without an account. We don&apos;t use analytics, advertising or tracking cookies.</li>
          <li>If you subscribe to the newsletter, we keep your email address so we can send you new stories, and nothing else.</li>
          <li>We never sell, rent or share your email address for marketing.</li>
          <li>You can unsubscribe in one click from any email, and ask us to delete your details at any time.</li>
        </ul>
      </LegalSection>

      <LegalSection title="What we collect">
        <p>
          <strong>If you subscribe:</strong> your email address, the date you subscribed (and unsubscribed, if you do), and a random
          code that makes the unsubscribe link in each email work.
        </p>
        <p>
          <strong>Settings on your device:</strong> your browser remembers whether you chose the light or dark theme, and whether
          you&apos;ve already seen the intro animation in this visit. These stay on your own device and are never sent to us.
        </p>
        <p>
          <strong>Server logs:</strong> like any website, our hosting provider may briefly record technical details such as your IP
          address and browser type, to keep the site secure and working.
        </p>
      </LegalSection>

      <LegalSection title="How we use it">
        <p>
          We use your email address only to send you a welcome email when you subscribe, and an email each time we publish a new
          story in the journal. We don&apos;t combine it with any other information or use it for anything else.
        </p>
      </LegalSection>

      <LegalSection title="Services we rely on">
        <p>A few trusted services handle data for us. Some of their servers are outside Nepal.</p>
        <ul>
          <li>
            <strong>Supabase</strong> stores the subscriber list and the site&apos;s photos and content.
          </li>
          <li>
            <strong>Google (Gmail)</strong> delivers our newsletter emails.
          </li>
          <li>
            <strong>OpenStreetMap</strong> provides the maps. When you view a map, your browser loads map images straight from
            OpenStreetMap&apos;s servers, which can see your IP address. See the{" "}
            <a href="https://osmfoundation.org/wiki/Privacy_Policy" target="_blank" rel="noreferrer">
              OpenStreetMap privacy policy
            </a>
            .
          </li>
          <li>
            <strong>Google Maps</strong> opens only if you tap a &ldquo;Directions&rdquo; link, and then its own privacy policy applies.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="How long we keep it">
        <p>
          We keep your email address while you&apos;re subscribed. When you unsubscribe we stop emailing you straight away, and keep a
          note that you left so you aren&apos;t emailed again by mistake. If you&apos;d like your address erased completely, email us
          and we&apos;ll delete it.
        </p>
      </LegalSection>

      <LegalSection title="Your choices">
        <ul>
          <li>Unsubscribe at any time with the link at the bottom of every email.</li>
          <li>Ask us for a copy of what we hold about you, or to correct or delete it, by emailing {mail}. We&apos;ll reply within 30 days.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Children">
        <p>{site.name} isn&apos;t aimed at children. Please don&apos;t subscribe if you&apos;re under 16.</p>
      </LegalSection>

      <LegalSection title="Changes and contact">
        <p>
          If we change this policy, we&apos;ll update the date at the top of this page. Questions? Email {mail}. See also our{" "}
          <Link href="/terms">Terms of Use</Link>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
