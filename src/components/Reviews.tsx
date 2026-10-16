import { formatDate } from "@/lib/site";
import type { Review } from "@/lib/types";
import { ReviewForm } from "./ReviewForm";
import { Stars } from "./Stars";

/** The reviews section of a place page: average, approved reviews, and the form. */
export function Reviews({ place, reviews, average }: { place: string; reviews: Review[]; average: number }) {
  return (
    <section id="reviews" className="mt-14 scroll-mt-20">
      <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-line pb-3">
        <h2 className="text-2xl font-semibold tracking-tight">Reviews</h2>
        {reviews.length > 0 && (
          <p className="text-sm">
            <Stars rating={average} /> <span className="ml-1 font-medium">{average.toFixed(1)}</span>
            <span className="text-muted"> · {reviews.length} {reviews.length === 1 ? "review" : "reviews"}</span>
          </p>
        )}
      </div>
      {reviews.length === 0 && <p className="mt-4 text-sm text-muted">No reviews yet. Been here? Tell others what it&apos;s like.</p>}
      <ul className="divide-y divide-line">
        {reviews.map((r) => (
          <li key={r.id} className="py-5">
            <p className="flex flex-wrap items-baseline gap-x-3 text-sm">
              <Stars rating={r.rating} />
              <span className="font-medium">{r.name || "A visitor"}</span>
              <span className="text-xs text-muted">{formatDate(r.createdAt)}</span>
            </p>
            {r.body && <p className="mt-2 whitespace-pre-line leading-relaxed">{r.body}</p>}
          </li>
        ))}
      </ul>
      <div className="mt-6">
        <ReviewForm place={place} />
      </div>
    </section>
  );
}
