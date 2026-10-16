import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection } from "@/components/LegalPage";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: `The terms for using ${site.name}.`,
};

export default function TermsPage() {
  const mail = <a href={`mailto:${site.email}`}>{site.email}</a>;
  return (
    <LegalPage
      title="Terms of"
      italic="use"
      updated="2026-10-16"
      intro={`By using ${site.name} you agree to these terms. They're short, and written to be read.`}
    >
      <LegalSection title="A guide, not a guarantee">
        <p>
          We try to keep every listing accurate, but places change. Opening hours, prices and menus shift, and places close.
          Many listings start from OpenStreetMap data and may be out of date. Please check before you make a special trip.
        </p>
        <p>
          We aren&apos;t responsible for the food, service, safety or anything else at the places we list. Your visit is between you
          and them.
        </p>
      </LegalSection>

      <LegalSection title="Our opinions are our own">
        <p>
          Reviews and recommendations on {site.name} are our honest opinions. Unless clearly marked as sponsored, listings and
          reviews aren&apos;t paid for. Being listed isn&apos;t an endorsement, and not being listed isn&apos;t a criticism.
        </p>
      </LegalSection>

      <LegalSection title="Our content">
        <ul>
          <li>Unless credited otherwise, the text and photos on {site.name} are ours.</li>
          <li>You&apos;re welcome to share links and short quotes with credit. Please don&apos;t copy whole pages or reuse our photos without asking.</li>
          <li>
            Map and place data is &copy;{" "}
            <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
              OpenStreetMap contributors
            </a>
            , available under the Open Database License.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="If you run a listed place">
        <p>
          Spotted a mistake, or want your place updated or removed? Email {mail} and we&apos;ll sort it out.
        </p>
      </LegalSection>

      <LegalSection title="The newsletter">
        <p>
          The newsletter is free, and you can unsubscribe at any time. Our <Link href="/privacy">Privacy Policy</Link> explains how
          we handle your email address.
        </p>
      </LegalSection>

      <LegalSection title="Links to other sites">
        <p>
          We link to websites, social media and maps we don&apos;t control. We aren&apos;t responsible for their content or how they
          handle your data.
        </p>
      </LegalSection>

      <LegalSection title="Liability">
        <p>
          {site.name} is provided &ldquo;as is&rdquo;. As far as the law allows, we aren&apos;t liable for any loss or damage arising from
          your use of the site or the information on it.
        </p>
      </LegalSection>

      <LegalSection title="Changes, law and contact">
        <p>
          We may update these terms, and the date at the top will show when. These terms are governed by the laws of Nepal.
          Questions? Email {mail}.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
