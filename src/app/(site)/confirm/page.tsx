import type { Metadata } from "next";
import { ConfirmForm } from "@/components/ConfirmForm";

export const metadata: Metadata = { title: "Confirm your subscription", robots: { index: false } };

export default async function ConfirmPage({ searchParams }: PageProps<"/confirm">) {
  const { token } = await searchParams;
  return (
    <section className="mx-auto max-w-xl px-4 py-24 text-center sm:px-6">
      <h1 className="text-4xl font-semibold tracking-tight">
        One last <span className="font-serif font-normal italic">step.</span>
      </h1>
      {typeof token === "string" && token ? (
        <ConfirmForm token={token} />
      ) : (
        <p className="mt-5 text-muted">This link is missing its code. Use the button in the confirmation email.</p>
      )}
    </section>
  );
}
