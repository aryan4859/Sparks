"use client";

import { useEffect, useRef } from "react";

/**
 * Footprints that follow the mouse: each ~70px of movement leaves a step, older
 * steps fade, and when the cursor stops the last two steps land beside it.
 * Adapted from a GSAP pen, rewritten without GSAP.
 *
 * Kept from affecting the rest of the site:
 * - a fixed, click-through overlay (pointer-events: none) that never changes page layout or scrolling
 * - mouse only (skipped on touch screens, where it would trail under the finger while scrolling)
 * - off for reduced-motion users, and waits for the intro preloader to finish
 */

const STEPS = 9;
const SIZE = 50;
const INK = 0.35; // footprint strength: 1 = solid, lower = subtler
const STRIDE = 70; // px of movement per step
const REPEL = 35; // newest step sits this far behind the cursor

type Foot = { x: number; y: number; angle: number; age: number };

const easeOutQuad = (t: number) => 1 - (1 - t) * (1 - t);
const easeOutBack = (t: number, s = 3) => 1 + (s + 1) * (t - 1) ** 3 + s * (t - 1) ** 2;

export function Footsteps() {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    if (!matchMedia("(pointer: fine)").matches || matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const els = [...svg.querySelectorAll<SVGUseElement>("use[data-foot]")];
    const feet: Foot[] = Array.from({ length: STEPS }, () => ({ x: 0, y: 0, angle: 0, age: 0 }));
    const pointer = { x: 0, y: 0, angle: 0, moving: false, justStopped: false };
    let steps = 0;
    let accX = 0;
    let accY = 0;
    let walking = false; // the intro walk drives the feet; ignore the real mouse meanwhile
    let frame = 0;
    const timeouts: number[] = [];
    const frames: number[] = [];

    const setFoot = (el: SVGUseElement, i: number, left: boolean) => {
      const f = feet[i];
      el.setAttribute("transform", `translate(${f.x} ${f.y}) rotate(${f.angle})`);
      el.setAttribute("href", left ? "#foot-left" : "#foot-right");
    };
    const show = (el: SVGUseElement, opacity: number) => (el.style.opacity = String(Math.max(0, Math.min(1, opacity))));

    function move(x: number, y: number) {
      const dx = x - pointer.x;
      const dy = y - pointer.y;
      pointer.x = x;
      pointer.y = y;
      pointer.moving = true;
      accX += dx;
      accY += dy;
      pointer.angle = Math.atan2(dx, dy);
      if (Math.hypot(accX, accY) <= STRIDE) return;

      steps++;
      accX = accY = 0;
      feet.unshift({
        x: x - Math.sin(pointer.angle) * REPEL,
        y: y - Math.cos(pointer.angle) * REPEL,
        angle: (1 - pointer.angle / Math.PI) * 180,
        age: 1,
      });
      feet.length = STEPS;
      for (let i = 1; i < STEPS; i++) setFoot(els[i], i, i % 2 === steps % 2);
      show(els[0], 0);
    }

    function render() {
      for (let i = 1; i < STEPS; i++) feet[i].age -= pointer.moving ? 0.05 : 0.1;
      for (let i = 2; i < STEPS; i++) show(els[i], feet[i].age);

      if (pointer.moving) {
        pointer.moving = false;
        pointer.justStopped = true;
      } else if (pointer.justStopped) {
        // Cursor just stopped: plant the last two steps beside it.
        pointer.justStopped = false;
        setFoot(els[0], 0, steps % 2 === 0);
        show(els[0], 1);
        timeouts.push(
          window.setTimeout(() => {
            setFoot(els[1], 0, steps % 2 === 1);
            show(els[1], 1);
          }, 100),
        );
        for (let i = 2; i < STEPS; i++) setFoot(els[i], i - 1, (i - 1) % 2 === steps % 2);
      }
      frame = requestAnimationFrame(render);
    }

    /** Walks in from the bottom-left corner once, like the original pen. */
    function introWalk() {
      walking = true;
      const start = performance.now();
      const from = { x: -100, y: innerHeight };
      const to = { x: 0.4 * innerWidth, y: 0.6 * innerHeight };
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / 500);
        move(from.x + (to.x - from.x) * easeOutQuad(t), from.y + (to.y - from.y) * easeOutBack(t));
        if (t < 1) frames.push(requestAnimationFrame(tick));
        else walking = false;
      };
      frames.push(requestAnimationFrame(tick));
    }

    const onMouseMove = (e: MouseEvent) => {
      if (!walking) move(e.clientX, e.clientY);
    };

    let started = false;
    function start() {
      if (started || document.documentElement.classList.contains("intro-running")) return;
      started = true;
      svg!.style.visibility = "visible";
      frame = requestAnimationFrame(render);
      introWalk();
      window.addEventListener("mousemove", onMouseMove, { passive: true });
    }

    // The preloader removes .intro-running from <html> when it's done.
    const observer = new MutationObserver(start);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    start();

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      timeouts.forEach(clearTimeout);
      frames.forEach(cancelAnimationFrame);
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, []);

  return (
    <svg
      ref={svgRef}
      aria-hidden
      focusable="false"
      className="pointer-events-none fixed inset-0 z-[1500] h-full w-full text-ink"
      style={{ visibility: "hidden" }}
    >
      <defs>
        <path
          id="foot-shape"
          d="M41.5,30.2C36,24.6,4.7,26.1,7.7,49.4c.8,5.9,4,10.2,8,19.9,3,7.2-.1,15.7,5.8,20.8S43,91.6,38.6,75.9c-1.8-6.5-7.6-9.3-8.9-14.1C26.1,47.9,51.7,40.6,41.5,30.2Z M41.7,7.6c-2.6-.3-5.2,2.8-5.6,7s1.3,7.8,3.9,8.1,5.2-2.9,5.6-7.1S44.4,7.8,41.7,7.6Z M28.8,21.9c2.2.2,4.1-2.1,4.5-5.1s-1.1-5.7-3.2-6-4.1,2.1-4.5,5.1S26.7,21.6,28.8,21.9Z M20.1,23.3c1.6.1,3.1-1.8,3.4-4.4s-.8-4.7-2.4-4.9-3,1.8-3.3,4.3S18.5,23.1,20.1,23.3Z M14.9,25.5c1.4-.2,2.4-1.9,2.1-3.9s-1.6-3.4-3-3.3-2.4,2-2.2,3.9S13.4,25.7,14.9,25.5Z M10.9,29.2c1-.1,1.7-1.4,1.5-2.8s-1.1-2.5-2.2-2.4-1.7,1.4-1.6,2.8S9.8,29.3,10.9,29.2Z"
        />
        <symbol id="foot-left" viewBox="0 0 100 100">
          <use href="#foot-shape" />
        </symbol>
        <symbol id="foot-right" viewBox="0 0 100 100">
          <g transform="scale(-1, 1) translate(-100, 0)">
            <use href="#foot-shape" />
          </g>
        </symbol>
      </defs>
      {Array.from({ length: STEPS }, (_, i) => (
        <use
          key={i}
          data-foot=""
          href={i % 2 ? "#foot-left" : "#foot-right"}
          x={-SIZE / 2}
          y={-SIZE / 2}
          width={SIZE}
          height={SIZE}
          fill="currentColor"
          opacity={INK}
          style={{ opacity: 0 }}
        />
      ))}
    </svg>
  );
}
