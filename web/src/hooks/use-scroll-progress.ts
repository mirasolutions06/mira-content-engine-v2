"use client";

import { useEffect, useState, useRef, type RefObject } from "react";

/**
 * Returns a 0→1 progress value based on how far through
 * an element's scroll range the user has scrolled.
 *
 * 0 = element just entered viewport from bottom
 * 1 = element has scrolled fully past the top
 */
export function useScrollProgress(ref: RefObject<HTMLElement | null>): number {
  const [progress, setProgress] = useState(0);
  const rafId = useRef<number>(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onScroll = () => {
      cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const scrollHeight = el.scrollHeight || el.offsetHeight;
        const viewportHeight = window.innerHeight;

        // How far through this element's total scroll range
        const start = rect.top;
        const totalRange = scrollHeight - viewportHeight;

        if (totalRange <= 0) {
          setProgress(0);
          return;
        }

        const scrolled = -start;
        const p = Math.max(0, Math.min(1, scrolled / totalRange));
        setProgress(p);
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(rafId.current);
    };
  }, [ref]);

  return progress;
}
