import Image from "next/image";
import { Fragment } from "react";
import { isAllowedImage } from "@/lib/validate";

/**
 * Story text formatting, used by the live story page and the editor's preview:
 *   **bold**   *italic*   [link text](https://example.com)   [a place](/places/slug)
 * Turned into React elements, never raw HTML, so story text can't inject markup.
 */
// A * only counts when it touches a word ("2 * 3 * 4" stays as it is).
const INLINE = /\*\*(?!\s)(.+?)(?<!\s)\*\*|\*(?!\s)(.+?)(?<!\s)\*|\[([^\]]+)\]\(([^)\s]+)\)/g;

/** Only web links and links within the site; anything else (javascript: etc.) stays plain text. */
function safeHref(url: string) {
  if (url.startsWith("/") && !url.startsWith("//")) return { href: url, external: false };
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:" ? { href: u.href, external: true } : null;
  } catch {
    return null;
  }
}

export function RichText({ text }: { text: string }) {
  const out: React.ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(INLINE)) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const [, bold, italic, label, url] = m;
    if (bold !== undefined) out.push(<strong key={m.index}><RichText text={bold} /></strong>);
    else if (italic !== undefined) out.push(<em key={m.index}><RichText text={italic} /></em>);
    else {
      const link = safeHref(url);
      out.push(
        link ? (
          <a
            key={m.index}
            href={link.href}
            className="underline decoration-1 underline-offset-2 hover:text-muted"
            {...(link.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          >
            <RichText text={label} />
          </a>
        ) : (
          <Fragment key={m.index}>{label}</Fragment>
        ),
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return <>{out}</>;
}

export function PostParagraph({ text }: { text: string }) {
  return (
    <p>
      <RichText text={text} />
    </p>
  );
}

/** Headings: *italic* words get the site's serif italic, as in page titles. */
export function PostHeading({ text }: { text: string }) {
  return (
    <h2 className="pt-6 text-2xl font-semibold tracking-tight [&_em]:font-serif [&_em]:font-normal">
      <RichText text={text} />
    </h2>
  );
}

export function PostImage({ src, caption }: { src: string; caption?: string }) {
  // Images from unsupported hosts would crash next/image; skip them instead.
  if (!isAllowedImage(src)) return null;
  return (
    <figure className="-mx-4 py-4 sm:-mx-16">
      <div className="relative aspect-[16/10] bg-card">
        <Image src={src} alt={caption ?? ""} fill sizes="(min-width: 768px) 800px, 100vw" className="object-cover" />
      </div>
      {caption && <figcaption className="mt-2 px-4 text-sm text-muted sm:px-16">{caption}</figcaption>}
    </figure>
  );
}
