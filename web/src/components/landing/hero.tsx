"use client";

import { motion } from "framer-motion";
import { ArrowRight, ChevronDown } from "lucide-react";
import { ScrollFrameCanvas } from "@/components/scroll-frame-canvas";

export function Hero() {
  return (
    <ScrollFrameCanvas
      framePath="/frames/hero/frame-"
      frameCount={121}
      scrollHeight="300vh"
      fallbackSrc="/portfolio/nike-1-landscape.jpg"
      ext="jpg"
    >
      {(progress) => {
        const headlineOpacity =
          progress < 0.3 ? 1 : Math.max(0, 1 - (progress - 0.3) / 0.15);
        const statsOpacity =
          progress > 0.7 ? Math.min(1, (progress - 0.7) / 0.15) : 0;
        const scrollIndicatorOpacity =
          progress < 0.05 ? 1 : Math.max(0, 1 - progress / 0.1);

        return (
          <div className="h-full min-h-screen relative">
            {/* Gradient overlays for text readability — pointer-events-none so text is selectable */}
            <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/50 to-transparent pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-background/40 pointer-events-none" />

            {/* Headline */}
            <div
              className="absolute inset-0 flex items-center z-10"
              style={{ opacity: headlineOpacity }}
            >
              <div className="mx-auto max-w-7xl px-6 w-full">
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                    className="mb-8 inline-flex items-center gap-2 rounded-full border border-foreground/15 bg-foreground/5 px-4 py-1.5 text-sm text-foreground/60 backdrop-blur-sm"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-foreground/60 animate-pulse" />
                    AI Content Production Agency
                  </motion.div>

                  <h1 className="text-6xl sm:text-7xl lg:text-[5.5rem] font-bold tracking-tight leading-[1.05]">
                    Content that
                    <br />
                    <span className="text-gradient">sells.</span>
                  </h1>

                  <p className="mt-8 text-xl text-muted-foreground max-w-lg leading-relaxed">
                    Brand images, video, copy, and monetization — from a single
                    brief. Campaign-grade output, agency speed.
                  </p>

                  <motion.div
                    className="mt-10 flex items-center gap-6"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.6 }}
                  >
                    <a
                      href="#pricing"
                      className="btn-shimmer group inline-flex items-center gap-2 rounded-full bg-foreground px-8 py-4 text-base font-medium text-background glow-white hover:glow-white-strong transition-all duration-300"
                    >
                      Start Your Campaign
                      <ArrowRight
                        size={16}
                        className="group-hover:translate-x-1 transition-transform duration-300"
                      />
                    </a>
                    <a
                      href="#portfolio"
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-300 underline underline-offset-4 decoration-border hover:decoration-foreground"
                    >
                      See the work
                    </a>
                  </motion.div>
                </motion.div>
              </div>
            </div>

            {/* Stats — pointer-events-none when hidden so headline text stays selectable */}
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{
                opacity: statsOpacity,
                pointerEvents: statsOpacity > 0 ? "auto" : "none",
              }}
            >
              <div className="glass rounded-2xl p-12 sm:p-16">
                <div className="grid grid-cols-3 gap-12 sm:gap-20 text-center">
                  {[
                    { value: "4.8/5", label: "Average QA Score" },
                    { value: "< £2", label: "Per Image" },
                    { value: "24hr", label: "Turnaround" },
                  ].map((stat) => (
                    <div key={stat.label}>
                      <div className="text-4xl sm:text-5xl font-bold">
                        {stat.value}
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground tracking-widest uppercase">
                        {stat.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Scroll indicator */}
            <div
              className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none"
              style={{ opacity: scrollIndicatorOpacity }}
            >
              <span className="text-[10px] text-muted-foreground tracking-[0.2em] uppercase">
                Scroll
              </span>
              <ChevronDown
                size={16}
                className="text-muted-foreground scroll-indicator"
              />
            </div>
          </div>
        );
      }}
    </ScrollFrameCanvas>
  );
}
