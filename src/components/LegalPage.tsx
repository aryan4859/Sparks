import { formatDate } from "@/lib/site";

/** Shared layout for the privacy policy and terms pages. */
export function LegalPage({
  title,
  italic,
  updated,
  intro,
  children,
}: {
  title: string;
  italic: string;
  updated: string;
  intro: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <article className="mx-auto max-w-2xl px-4 sm:px-6">
      <header className="pb-10 pt-14 sm:pt-20">
        <p className="label text-muted">Last updated {formatDate(updated)}</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-6xl">
          {title} <span className="font-serif font-normal italic">{italic}</span>
        </h1>
        <p className="mt-5 text-muted sm:text-lg">{intro}</p>
      </header>
      <div className="space-y-10 border-t border-line pt-10 leading-relaxed">{children}</div>
    </article>
  );
}

export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 [&_a]:underline [&_a:hover]:text-muted [&_li]:pl-1 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}
