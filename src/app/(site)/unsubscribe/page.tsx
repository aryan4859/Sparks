import type { Metadata } from "next";
import { UnsubscribeForm } from "@/components/UnsubscribeForm";

export const metadata: Metadata = { title: "Unsubscribe", robots: { index: false } };

export default async function UnsubscribePage({ searchParams }: PageProps<"/unsubscribe">) {
  const { token } = await searchParams;
  return (
    <section className="mx-auto max-w-xl px-4 py-24 text-center sm:px-6">
      <h1 className="text-4xl font-semibold tracking-tight">
        Leaving the <span className="font-serif font-normal italic">newsletter?</span>
      </h1>
      {typeof token === "string" && token ? (
        <UnsubscribeForm token={token} />
      ) : (
        <p className="mt-5 text-muted">This link is missing its code. Use the unsubscribe link at the bottom of any email.</p>
      )}
    </section>
  );
}
