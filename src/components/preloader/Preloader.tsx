import { SparksLogo } from "@/components/SparksLogo";
import { CELL, INTRO_LETTERS, LETTERS_WIDTH, OVERLAP } from "./letters";
import { PreloaderRunner } from "./PreloaderRunner";

const STORAGE_KEY = "sparks-intro-seen";

/**
 * Runs before first paint (injected as raw HTML at the top of <body> in the root
 * layout): play the intro once per browser session on public pages, never for
 * reduced-motion visitors.
 */
export const preloaderDecisionScript = `try{if(!location.pathname.startsWith("/admin")&&!sessionStorage.getItem(${JSON.stringify(STORAGE_KEY)})&&!matchMedia("(prefers-reduced-motion: reduce)").matches)document.documentElement.classList.add("intro-running")}catch(e){}`;

/** Final logo row: 260×62, centred over the letters (as in the anime.js intro). */
const FINAL = { width: 260, height: 62, top: 50 };

export function Preloader() {
  return (
    <div className="preloader" aria-hidden="true">
      <div data-bg className="absolute inset-0" />
      {/* shrink-0: on narrow screens flexbox would squeeze the stage, pushing the letters off-centre */}
      <div className="intro-stage relative shrink-0" style={{ width: LETTERS_WIDTH, height: CELL }}>
        {INTRO_LETTERS.map((letter, i) => (
          <div
            key={letter.key}
            className="absolute"
            style={{ left: i * (CELL - OVERLAP), top: letter.top, width: CELL, height: letter.height }}
          >
            <svg viewBox={letter.viewBox} width={CELL} height={letter.height} overflow="visible">
              <g fill="none" fillRule="evenodd" stroke={letter.color}>
                {letter.fills.map((f, j) => (
                  <path key={`in${j}`} data-fill-in data-color={letter.color} strokeWidth={40} d={f.in} />
                ))}
                {letter.fills.map((f, j) => (
                  <path key={`out${j}`} data-fill-out strokeWidth={40} d={f.out} />
                ))}
                {letter.lines.map((d, j) => (
                  <path key={`line${j}`} data-line-out strokeWidth={2} d={d} />
                ))}
              </g>
            </svg>
          </div>
        ))}

        {/* The full stop that shoots across and back */}
        <svg data-dot viewBox="0 0 42 42" className="absolute" style={{ width: 42, height: 42, right: -56, bottom: 0 }}>
          <circle cx="21" cy="21" r="20" fill="#FFFFFF" />
        </svg>

        <div
          className="intro-final absolute"
          style={{ left: (LETTERS_WIDTH - FINAL.width) / 2, top: FINAL.top, width: FINAL.width, height: FINAL.height }}
        >
          <SparksLogo className="block h-full w-full" />
        </div>
      </div>
      <PreloaderRunner storageKey={STORAGE_KEY} />
    </div>
  );
}
