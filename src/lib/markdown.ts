import type { PostBlock } from "./types";

/**
 * A deliberately tiny markdown dialect for journal posts:
 *
 *   ## Heading
 *   ![Caption](https://image-url)
 *   [[place:some-slug]]        ← embeds a place card
 *   Blank-line separated paragraphs.
 */
export function parsePostBody(body: string): PostBlock[] {
  return body
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk): PostBlock => {
      const heading = chunk.match(/^#{1,3}\s+(.+)$/);
      if (heading) return { type: "h", text: heading[1] };
      const image = chunk.match(/^!\[([^\]]*)\]\((\S+)\)$/);
      if (image) return { type: "img", src: image[2], caption: image[1] || undefined };
      const place = chunk.match(/^\[\[place:([a-z0-9-]+)\]\]$/);
      if (place) return { type: "place", slug: place[1] };
      return { type: "p", text: chunk.replace(/\n/g, " ") };
    });
}

export function readingMinutes(body: string) {
  return Math.max(1, Math.round(body.split(/\s+/).length / 220));
}
