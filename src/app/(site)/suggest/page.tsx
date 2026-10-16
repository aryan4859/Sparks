import type { Metadata } from "next";
import { SuggestForm } from "@/components/SuggestForm";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Suggest a place",
  description: `Know a café, restaurant or shop we should visit? Tell ${site.name}.`,
  alternates: { canonical: "/suggest" },
};

export default function SuggestPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6">
      <header className="pb-10 pt-14 sm:pt-20">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">
          Suggest a <span className="font-serif font-normal italic">place</span>
        </h1>
        <p className="mt-5 text-muted sm:text-lg">
          A café with the best window seat, a momo stall worth the queue, a shop nobody knows about yet? Tell us. We visit
          every suggestion before anything goes on {site.name}.
        </p>
      </header>
      <SuggestForm />
    </div>
  );
}
