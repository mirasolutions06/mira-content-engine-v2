"use client";

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useScrollProgress } from "@/hooks/use-scroll-progress";

interface ScrollFrameCanvasProps {
  /** Path prefix for frame images, e.g. "/frames/hero/frame-" */
  framePath: string;
  /** Total number of frames */
  frameCount: number;
  /** How tall the scroll container is (controls scroll duration) */
  scrollHeight?: string;
  /** Overlay content — either static ReactNode or render prop receiving progress (0→1) */
  children?: ReactNode | ((progress: number) => ReactNode);
  /** Static fallback image for mobile / reduced motion */
  fallbackSrc?: string;
  /** Frame file extension */
  ext?: string;
}

export function ScrollFrameCanvas({
  framePath,
  frameCount,
  scrollHeight = "300vh",
  children,
  fallbackSrc,
  ext = "webp",
}: ScrollFrameCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const progress = useScrollProgress(containerRef);

  // Detect mobile + reduced motion
  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
    setPrefersReducedMotion(
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }, []);

  // Generate frame URL from index (1-based, zero-padded to 4 digits)
  const frameUrl = useCallback(
    (index: number) => `${framePath}${String(index).padStart(4, "0")}.${ext}`,
    [framePath, ext]
  );

  // Preload all frames
  useEffect(() => {
    if (isMobile || prefersReducedMotion) return;

    const images: HTMLImageElement[] = [];
    let loadedCount = 0;

    for (let i = 1; i <= frameCount; i++) {
      const img = new Image();
      img.src = frameUrl(i);
      img.onload = () => {
        loadedCount++;
        if (loadedCount >= Math.min(20, frameCount)) {
          setLoaded(true);
        }
      };
      images.push(img);
    }

    imagesRef.current = images;
  }, [frameCount, frameUrl, isMobile, prefersReducedMotion]);

  // Draw current frame on scroll
  useEffect(() => {
    if (!loaded || isMobile || prefersReducedMotion) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const frameIndex = Math.min(
      frameCount - 1,
      Math.max(0, Math.floor(progress * frameCount))
    );

    const img = imagesRef.current[frameIndex];
    if (!img || !img.complete) return;

    // Size canvas to image dimensions (only once or on resize)
    if (canvas.width !== img.naturalWidth) {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
  }, [progress, loaded, frameCount, isMobile, prefersReducedMotion]);

  const rendered = typeof children === "function" ? children(progress) : children;

  // Mobile / reduced motion fallback
  if (isMobile || prefersReducedMotion) {
    return (
      <section className="relative min-h-screen">
        {fallbackSrc && (
          <img
            src={fallbackSrc}
            alt="Background visual"
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        <div className="relative z-10 min-h-screen">{rendered}</div>
      </section>
    );
  }

  return (
    <section
      ref={containerRef}
      style={{ height: scrollHeight }}
      className="relative"
    >
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label="Scroll-driven video animation"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Overlay content */}
        <div className="relative z-10 h-full">{rendered}</div>
      </div>
    </section>
  );
}
