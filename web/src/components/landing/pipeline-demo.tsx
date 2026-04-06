"use client";

import { useRef } from "react";
import { useScrollProgress } from "@/hooks/use-scroll-progress";
import { cn } from "@/lib/utils";
import Image from "next/image";

const steps = [
  {
    number: "01",
    title: "Brief",
    description: "Tell us your brand, product, and goals.",
  },
  {
    number: "02",
    title: "Generate",
    description: "AI creates campaign-grade images and video.",
  },
  {
    number: "03",
    title: "Copy",
    description: "Platform-native captions, ads, and emails.",
  },
  {
    number: "04",
    title: "Package",
    description: "Organized by platform, ready to post.",
  },
  {
    number: "05",
    title: "Monetize",
    description: "Real affiliate programs and revenue strategy.",
  },
];

const generatedImages = [
  "/portfolio/nike-1-landscape.jpg",
  "/portfolio/nike-3-square.jpg",
  "/portfolio/ama-shea-1-square.jpg",
  "/portfolio/ama-shea-3-square.jpg",
];

const platforms = [
  { name: "Instagram", icon: "IG" },
  { name: "TikTok", icon: "TT" },
  { name: "LinkedIn", icon: "LI" },
  { name: "YouTube", icon: "YT" },
];

export function PipelineDemo() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const progress = useScrollProgress(sectionRef);

  const activeStep = Math.min(4, Math.floor(progress * 5));
  const stepProgress = (progress * 5) % 1;

  return (
    <section
      ref={sectionRef}
      id="how-it-works"
      style={{ height: "400vh" }}
      className="relative"
    >
      <div className="sticky top-0 h-screen w-full flex items-center overflow-hidden">
        <div className="mx-auto max-w-7xl px-6 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left: step info */}
            <div>
              <p className="text-xs font-mono text-muted-foreground mb-4 tracking-widest uppercase">
                How it works
              </p>
              <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-14">
                Five steps.
                <br />
                <span className="text-gradient-warm">Zero guesswork.</span>
              </h2>

              <div className="space-y-1 relative">
                {/* Connecting line */}
                <div className="absolute left-[11px] top-4 bottom-4 w-px bg-border/50" />
                <div
                  className="absolute left-[11px] top-4 w-px bg-foreground/40 transition-all duration-700"
                  style={{ height: `${(activeStep / 4) * 100}%` }}
                />

                {steps.map((step, i) => (
                  <div
                    key={step.number}
                    className={cn(
                      "flex items-start gap-5 py-3 transition-all duration-500 relative",
                      i === activeStep
                        ? "opacity-100"
                        : i < activeStep
                        ? "opacity-30"
                        : "opacity-10"
                    )}
                  >
                    <div
                      className={cn(
                        "relative z-10 mt-1.5 h-[23px] w-[23px] rounded-full border flex items-center justify-center transition-all duration-500 shrink-0",
                        i === activeStep
                          ? "border-foreground/60 bg-foreground/10 pulse-accent"
                          : i < activeStep
                          ? "border-foreground/40 bg-foreground/20"
                          : "border-border bg-background"
                      )}
                    >
                      {i <= activeStep && (
                        <div className={cn(
                          "h-2 w-2 rounded-full bg-foreground/80",
                          i === activeStep && "animate-pulse"
                        )} />
                      )}
                    </div>
                    <div>
                      <h3
                        className={cn(
                          "text-lg font-semibold transition-colors duration-300",
                          i === activeStep
                            ? "text-foreground"
                            : "text-muted-foreground"
                        )}
                      >
                        {step.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {step.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: visual for current step */}
            <div className="relative h-[400px] flex items-center justify-center">
              {/* Step 0: Brief */}
              <StepVisual active={activeStep === 0}>
                <div className="w-full max-w-sm glass rounded-xl p-6 font-mono text-sm">
                  <div className="flex items-center gap-2 mb-3 pb-3 border-b border-border/30">
                    <div className="h-2 w-2 rounded-full bg-foreground/20" />
                    <div className="h-2 w-2 rounded-full bg-foreground/20" />
                    <div className="h-2 w-2 rounded-full bg-foreground/20" />
                    <span className="ml-2 text-[10px] text-muted-foreground">brief</span>
                  </div>
                  <div className="text-muted-foreground mb-2">$ mira brief</div>
                  <div className="text-foreground/80">
                    <span className="text-foreground">&gt;</span> &quot;Luxury skincare
                    brand, golden amber tones, product hero shots for Instagram
                    and TikTok&quot;
                    <span className="inline-block w-2 h-4 bg-foreground/60 ml-1 animate-pulse" />
                  </div>
                </div>
              </StepVisual>

              {/* Step 1: Generate */}
              <StepVisual active={activeStep === 1}>
                <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
                  {generatedImages.map((src, i) => (
                    <div
                      key={src}
                      className="relative aspect-square rounded-lg overflow-hidden ring-1 ring-white/5"
                      style={{
                        opacity: stepProgress > i * 0.2 ? 1 : 0,
                        transform: `scale(${stepProgress > i * 0.2 ? 1 : 0.85})`,
                        transition: "all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
                      }}
                    >
                      <Image
                        src={src}
                        alt="AI-generated campaign image"
                        fill
                        className="object-cover"
                        sizes="200px"
                      />
                      {stepProgress > (i + 1) * 0.2 && (
                        <div className="absolute top-2 right-2 bg-background/70 backdrop-blur-sm rounded-full px-2 py-0.5 text-[10px] font-mono text-foreground/70">
                          4.{7 + (i % 3)}/5
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </StepVisual>

              {/* Step 2: Copy */}
              <StepVisual active={activeStep === 2}>
                <div className="space-y-3 w-full max-w-sm">
                  {platforms.map((platform, i) => (
                    <div
                      key={platform.name}
                      className="glass rounded-lg p-4 flex items-center gap-3"
                      style={{
                        opacity: stepProgress > i * 0.2 ? 1 : 0,
                        transform: `translateX(${stepProgress > i * 0.2 ? 0 : 30}px)`,
                        transition: "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
                      }}
                    >
                      <div className="h-8 w-8 rounded-full bg-foreground/5 border border-border/50 flex items-center justify-center text-xs font-medium text-foreground/60">
                        {platform.icon}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium">{platform.name}</div>
                        <div className="text-xs text-muted-foreground">
                          Caption + hashtags ready
                        </div>
                      </div>
                      <div className="text-[10px] font-mono text-foreground/40">
                        {stepProgress > (i + 0.5) * 0.2 ? "Done" : "..."}
                      </div>
                    </div>
                  ))}
                </div>
              </StepVisual>

              {/* Step 3: Package */}
              <StepVisual active={activeStep === 3}>
                <div className="w-full max-w-sm glass rounded-xl p-6 font-mono text-xs">
                  <div className="flex items-center gap-2 mb-3 pb-3 border-b border-border/30">
                    <div className="h-2 w-2 rounded-full bg-foreground/20" />
                    <div className="h-2 w-2 rounded-full bg-foreground/20" />
                    <div className="h-2 w-2 rounded-full bg-foreground/20" />
                    <span className="ml-2 text-[10px] text-muted-foreground">deliverables</span>
                  </div>
                  {[
                    { text: "deliverables/", indent: 0 },
                    { text: "instagram/", indent: 1 },
                    { text: "brand-feed-1.jpg", indent: 2 },
                    { text: "brand-story-1.jpg", indent: 2 },
                    { text: "caption.json", indent: 2 },
                    { text: "tiktok/", indent: 1 },
                    { text: "brand-reel-1.mp4", indent: 2 },
                    { text: "posting-schedule.md", indent: 1 },
                  ].map((line, i) => (
                    <div
                      key={i}
                      className="py-0.5"
                      style={{
                        paddingLeft: `${line.indent * 16}px`,
                        opacity: stepProgress > i * 0.1 ? 1 : 0,
                        transition: "opacity 0.3s ease-out",
                      }}
                    >
                      <span
                        className={
                          line.text.endsWith("/")
                            ? "text-foreground/70"
                            : "text-muted-foreground"
                        }
                      >
                        {line.text}
                      </span>
                    </div>
                  ))}
                </div>
              </StepVisual>

              {/* Step 4: Monetize */}
              <StepVisual active={activeStep === 4}>
                <div className="w-full max-w-sm glass rounded-xl p-6">
                  <div className="text-sm font-medium mb-1">
                    Revenue Projection
                  </div>
                  <div className="text-[10px] text-muted-foreground mb-6 tracking-wider uppercase">
                    Based on real affiliate benchmarks
                  </div>
                  <div className="flex items-end gap-3 h-32">
                    {[
                      { label: "1K", height: 20, value: "£200" },
                      { label: "5K", height: 45, value: "£1.2K" },
                      { label: "10K", height: 65, value: "£3.5K" },
                      { label: "50K", height: 100, value: "£12K" },
                    ].map((bar) => (
                      <div
                        key={bar.label}
                        className="flex-1 flex flex-col items-center gap-2"
                      >
                        <span
                          className="text-[10px] font-mono text-foreground/50"
                          style={{
                            opacity: stepProgress > 0.5 ? 1 : 0,
                            transition: "opacity 0.4s",
                          }}
                        >
                          {bar.value}
                        </span>
                        <div
                          className="w-full rounded-t bg-gradient-to-t from-foreground/10 to-foreground/30"
                          style={{
                            height: `${bar.height * Math.min(1, stepProgress * 1.5)}%`,
                            transition: "height 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
                          }}
                        />
                        <span className="text-[10px] text-muted-foreground">
                          {bar.label}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-4 text-center tracking-widest uppercase">
                    Followers &rarr; Monthly revenue
                  </div>
                </div>
              </StepVisual>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function StepVisual({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "absolute inset-0 flex items-center justify-center transition-all duration-700",
        active
          ? "opacity-100 scale-100"
          : "opacity-0 scale-95 pointer-events-none"
      )}
    >
      {children}
    </div>
  );
}
