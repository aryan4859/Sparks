/**
 * The compact Sparks logo: an outlined icon (frame, circle, sparkle) and a
 * thin "SPARKS" wordmark. Monochrome — it inherits the text colour, with the
 * circle in muted grey — so it works on light, dark and the intro's black.
 * The same SVG is the navbar logo and the final frame of the intro animation,
 * so the hand-off between them is exact.
 */

const WORD = "SPARKS".split("");

export function SparksLogo({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 260 62" overflow="visible" className={className} style={style} role="img" aria-label="Sparks">
      <g data-icon>
        <g transform="translate(1 1)" fill="none" strokeWidth={2}>
          <path
            data-icon-line
            className="stroke-current"
            d="M4 0h54a2 2 0 0 1 2 2.01V58A2 2 0 0 1 58 60H2a2 2 0 0 1-2-2.01V2A2 2 0 0 1 2 0h2z"
          />
          <rect width="40" height="40" x="10" y="10" rx="20" className="stroke-muted" />
          <path
            data-icon-spark
            className="stroke-current"
            strokeLinejoin="round"
            d="M30 4C30 20 40 30 56 30C40 30 30 40 30 56C30 40 20 30 4 30C20 30 30 20 30 4Z"
          />
        </g>
      </g>
      <g data-word fill="currentColor" fontSize={34} fontWeight={200} style={{ fontFamily: "var(--font-geist-sans)" }}>
        {WORD.map((ch, i) => (
          <text key={i} x={77 + i * 30} y={43.7}>
            {ch}
          </text>
        ))}
      </g>
    </svg>
  );
}
