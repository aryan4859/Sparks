"use client";

import { animate, utils, type JSAnimation, type Target } from "animejs";
import { useEffect } from "react";
import { LETTERS_WIDTH } from "./letters";

/**
 * A port of the anime.js logo intro to Sparks, keeping its timeline:
 *
 *   0ms      the dot pops in and shoots left (it comes back at ~2.2s)
 *   700ms    big letters draw in white, then flood with colour
 *   1.9s     the fills wipe out, leaving thin outlines…
 *   2.5s     …which erase too
 *   2.8s     the icon appears and its frame draws (thick → thin)
 *   4.2s     the icon drops into place and S P A R K S rises in
 *   end      the finished logo flies into the navbar while the night fades
 */
export function PreloaderRunner({ storageKey }: { storageKey: string }) {
  useEffect(() => {
    const root = document.documentElement;
    if (!root.classList.contains("intro-running")) return;

    const overlay = document.querySelector<HTMLElement>(".preloader");
    const bg = overlay?.querySelector<HTMLElement>("[data-bg]");
    const stage = overlay?.querySelector<HTMLElement>(".intro-stage");
    const final = overlay?.querySelector<HTMLElement>(".intro-final");
    const target = document.querySelector<SVGSVGElement>("#site-logo svg");
    if (!overlay || !bg || !stage || !final || !target) return;

    const q = <T extends Element>(sel: string) => [...stage.querySelectorAll<T>(sel)];
    const fillIn = q<SVGPathElement>("[data-fill-in]");
    const fillOut = q<SVGPathElement>("[data-fill-out]");
    const lineOut = q<SVGPathElement>("[data-line-out]");
    const dot = stage.querySelector<SVGSVGElement>("[data-dot]")!;
    const icon = final.querySelector<SVGGElement>("[data-icon]")!;
    const iconLine = final.querySelector<SVGPathElement>("[data-icon-line]")!;
    const iconSpark = final.querySelector<SVGPathElement>("[data-icon-spark]")!;
    const word = [...final.querySelectorAll<SVGTextElement>("[data-word] text")];

    const anims: JSAnimation[] = [];
    const timers: number[] = [];
    let stopped = false;

    // Fit the stage on small screens (the pen's logoScale), leaving room for the full stop beyond the letters.
    const fit = Math.min(1, innerWidth / (LETTERS_WIDTH + 180));
    stage.style.transform = `scale(${fit})`;

    // Prepare dashes: everything starts undrawn, outlines start drawn but 0-width.
    const len = (el?: Target) => (el as SVGPathElement).getTotalLength();
    for (const p of [...fillIn, ...fillOut, iconLine, iconSpark]) {
      utils.set(p, { strokeDasharray: len(p), strokeDashoffset: len(p) });
    }
    for (const p of lineOut) utils.set(p, { strokeDasharray: len(p), strokeDashoffset: 0, strokeWidth: 0 });
    utils.set(dot, { scale: 0 });
    utils.set(icon, { opacity: 0, translateY: -60 });
    utils.set(word, { opacity: 0 });
    overlay.dataset.ready = "";

    anims.push(
      // The dot
      animate(dot, {
        translateX: [
          { to: -600, duration: 520, delay: 200, ease: "inQuart" },
          { from: -100, to: 0, duration: 500, delay: 1000, ease: "outQuart" },
        ],
        scale: [
          { from: 0, to: 1, duration: 200, ease: "outBack" },
          { to: 0, duration: 20, delay: 500, ease: "inQuart" },
          { to: 1, duration: 200, delay: 1000, ease: "outQuart" },
          { to: 0, duration: 400, delay: 500, ease: "inBack" },
        ],
      }),

      // Letters draw in white, turn to colour, then hand over to the "out" copies
      animate(fillIn, {
        strokeDashoffset: { from: len, to: 0, duration: 600, delay: (_?: Target, i = 0) => 700 + i * 100, ease: "outQuart" },
        stroke: { from: "#FFFFFF", to: (el?: Target) => (el as SVGPathElement).dataset.color!, duration: 500, delay: 500, ease: "inQuad" },
        opacity: { to: 0, duration: 1, delay: (_?: Target, i = 0) => 1900 + i * 80 },
      }),
      animate(fillOut, {
        strokeDashoffset: [
          { from: len, to: len, duration: 1890 },
          { from: 0, to: len, duration: 800, delay: (_?: Target, i = 0) => i * 80, ease: "inQuart" },
        ],
      }),

      // Outlines appear as the fills wipe away, then erase
      animate(lineOut, {
        strokeDashoffset: { from: 0, to: len, duration: 1200, delay: (_?: Target, i = 0) => 2500 + i * 100, ease: "inQuart" },
        strokeWidth: { from: 0, to: 2, duration: 200, delay: (_?: Target, i = 0) => 2000 + i * 100, ease: "linear" },
      }),

      // Icon: appears, frame draws thick → thin, then drops into place
      animate(icon, {
        opacity: { to: 1, duration: 10, delay: 2800, ease: "linear" },
        translateY: { to: 0, duration: 800, delay: 4200, ease: "outElastic(1, .5)" },
      }),
      animate(iconLine, {
        strokeDashoffset: [
          { from: len, to: len, duration: 3000 },
          { to: 0, duration: 1200, ease: "inOutQuart" },
        ],
        strokeWidth: { from: 8, to: 2, duration: 800, delay: 3000, ease: "inQuad" },
      }),
      animate(iconSpark, {
        strokeDashoffset: { from: len, to: 0, duration: 1000, delay: 3500, ease: "inOutQuart" },
      }),

      // The word rises in, letter by letter
      animate(word, {
        translateY: { from: 50, to: 0, duration: 1000, ease: "outElastic(1, .5)" },
        opacity: { from: 0, to: 1, duration: 100, ease: "linear" },
        delay: (_?: Target, i = 0) => 4200 + i * 20,
      }),
    );

    // ─── Fly into the navbar (First, Last, Invert, Play) ────────────────
    timers.push(
      window.setTimeout(() => {
        if (stopped) return;
        const from = final.getBoundingClientRect();
        const to = target.getBoundingClientRect();
        // `final` lives inside the scaled stage, so convert screen px to stage px.
        const dx = (to.left - from.left) / fit;
        const dy = (to.top - from.top) / fit;
        const scale = to.width / from.width;

        overlay.style.pointerEvents = "none";
        const easing = "cubic-bezier(0.76, 0, 0.24, 1)";
        const fly = final.animate(
          [
            { transform: "translate(0, 0) scale(1)", color: "#F2F2F2" },
            { transform: `translate(${dx}px, ${dy}px) scale(${scale})`, color: getComputedStyle(root).getPropertyValue("--ink").trim() },
          ],
          { duration: 1100, easing, fill: "forwards" },
        );
        bg.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 800, delay: 250, easing: "ease-in-out", fill: "forwards" });
        fly.finished.then(() => !stopped && finish(), () => {});
      }, 5500),
    );

    function finish() {
      root.classList.remove("intro-running");
      try {
        sessionStorage.setItem(storageKey, "1");
      } catch {}
    }

    return () => {
      stopped = true;
      timers.forEach(clearTimeout);
      anims.forEach((a) => a.revert());
    };
  }, [storageKey]);

  return null;
}
