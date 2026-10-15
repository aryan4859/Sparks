/** Monochrome tones for the big letters, on the intro's black background. */
const TONES = { light: "#F2F2F2", mid: "#A3A3A3", dark: "#5C5C5C" } as const;

/**
 * Big intro letters for "sparks", built like the anime.js intro letters:
 * 40-unit strokes on a 60-unit radius inside a 162-unit cell.
 *
 *   fills — centreline strokes; `in` draws the letter, `out` (the same stroke
 *           reversed) wipes it away
 *   lines — 2-unit outlines of the letter shape, shown as the fill wipes out
 *
 * "p" and "k" extend 80 units below / above the cell.
 */
export type IntroLetter = {
  key: string;
  color: string;
  viewBox: string;
  top: number;
  height: number;
  fills: { in: string; out: string }[];
  lines: string[];
};

const S = {
  fills: [
    {
      in: "M141 20H51a30 30 0 0 0 0 60h60a30 30 0 0 1 0 60H21",
      out: "M21 140H111a30 30 0 0 0 0-60H51a30 30 0 0 1 0-60h90",
    },
  ],
  lines: ["M141 0H51a50 50 0 0 0 0 100h60a10 10 0 0 1 0 20H21v40h90a50 50 0 0 0 0-100H51a10 10 0 0 1 0-20h90z"],
};

const STEM = { in: "M21 161V1", out: "M21 1v160" };
const STEM_LINE = "M41 161V1H1v160h40z";

export const INTRO_LETTERS: IntroLetter[] = [
  { key: "s1", color: TONES.light, viewBox: "0 0 162 162", top: 0, height: 162, ...S },
  {
    key: "p",
    color: TONES.mid,
    viewBox: "0 0 162 242",
    top: 0,
    height: 242,
    fills: [
      { in: "M21 241V1", out: "M21 1v240" },
      { in: "M21 81a60 60 0 1 1 120 0a60 60 0 1 1-120 0", out: "M21 81a60 60 0 1 0 120 0a60 60 0 1 0-120 0" },
    ],
    lines: ["M41 241V1H1v240h40z", "M161 81a80 80 0 1 1-160 0a80 80 0 1 1 160 0zM121 81a40 40 0 1 0-80 0a40 40 0 1 0 80 0z"],
  },
  {
    // straight from the anime.js intro
    key: "a",
    color: TONES.dark,
    viewBox: "0 0 162 162",
    top: 0,
    height: 162,
    fills: [{ in: "M101 141H81a60 60 0 1 1 0-120c33.14 0 59 26.86 60 60v80", out: "M141 161V81c-1-33.14-26.86-60-60-60a60 60 0 1 0 0 120h20" }],
    lines: ["M121 161V81.33C120.18 58.59 102.7 41 81 41a40 40 0 1 0 0 80h20v40H81A80 80 0 1 1 81 1c43.8 0 78.66 35.27 80 79.7V161h-40z"],
  },
  {
    key: "r",
    color: TONES.light,
    viewBox: "0 0 162 162",
    top: 0,
    height: 162,
    fills: [
      STEM,
      { in: "M21 161V81a60 60 0 0 1 60-60a60 60 0 0 1 42.43 17.57", out: "M123.43 38.57A60 60 0 0 0 81 21a60 60 0 0 0-60 60v80" },
    ],
    lines: [STEM_LINE, "M1 161V81a80 80 0 0 1 80-80a80 80 0 0 1 56.57 23.43L109.28 52.72A40 40 0 0 0 81 41a40 40 0 0 0-40 40v80z"],
  },
  {
    key: "k",
    color: TONES.mid,
    viewBox: "0 -80 162 242",
    top: -80,
    height: 242,
    fills: [
      { in: "M21 161V-79", out: "M21-79V161" },
      { in: "M21 111L131 21", out: "M131 21L21 111" },
      { in: "M66 74L128 151", out: "M128 151L66 74" },
    ],
    lines: [
      "M41 161V-79H1v240h40z",
      "M8.34 95.52L118.34 5.52L143.66 36.48L33.66 126.48z",
      "M50.42 86.54L81.58 61.46L143.58 138.46L112.42 163.54z",
    ],
  },
  { key: "s2", color: TONES.dark, viewBox: "0 0 162 162", top: 0, height: 162, ...S },
];

/** Cell size and overlap, as in the anime.js intro. */
export const CELL = 162;
export const OVERLAP = 42;
export const LETTERS_WIDTH = INTRO_LETTERS.length * CELL - (INTRO_LETTERS.length - 1) * OVERLAP;
