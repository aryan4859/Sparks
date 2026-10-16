/** ★★★★☆ — `rating` may be fractional (rounded to the nearest whole star for display). */
export function Stars({ rating, className = "" }: { rating: number; className?: string }) {
  const full = Math.round(rating);
  return (
    <span className={`tracking-[0.1em] ${className}`} role="img" aria-label={`${rating.toFixed(1)} out of 5 stars`}>
      <span aria-hidden>{"★".repeat(full)}</span>
      <span aria-hidden className="text-line">{"★".repeat(5 - full)}</span>
    </span>
  );
}
