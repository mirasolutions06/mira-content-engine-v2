"use client";

import { useRef } from "react";
import { Check, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useScrollProgress } from "@/hooks/use-scroll-progress";

const tiers = [
  {
    name: "Starter",
    price: "£497",
    description: "Perfect for launching your brand's visual identity.",
    features: [
      "5-7 AI-generated brand images",
      "Mixed formats (story, square, landscape)",
      "Copy for 3 platforms",
      "Posting schedule",
      "1 revision round",
      "48-hour delivery",
    ],
    cta: "Start Here",
    featured: false,
  },
  {
    name: "Growth",
    price: "£997",
    description: "Images, video, and copy — the full content stack.",
    features: [
      "Everything in Starter",
      "AI-generated video with voiceover",
      "Copy for all platforms",
      "4-email nurture sequence",
      "Lead magnet concept",
      "2 revision rounds",
      "3-day delivery",
    ],
    cta: "Most Popular",
    featured: true,
  },
  {
    name: "Premium",
    price: "£1,997",
    description: "Full campaign production with monetization built in.",
    features: [
      "Everything in Growth",
      "10+ images across all formats",
      "Monetization strategy & affiliate research",
      "Revenue projections by follower tier",
      "UTM tracking setup",
      "Posting calendar + content roadmap",
      "3 revision rounds",
    ],
    cta: "Go Premium",
    featured: false,
  },
];

export function Pricing() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const progress = useScrollProgress(sectionRef);

  return (
    <section ref={sectionRef} id="pricing" className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center mb-16">
          <p className="text-xs font-mono text-muted-foreground tracking-widest uppercase mb-4">
            Pricing
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Simple packages. Serious output.
          </h2>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
            No subscriptions, no per-image fees. One package, one price,
            everything you need to launch.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {tiers.map((tier, i) => {
            const cardProgress = Math.max(0, Math.min(1, (progress - 0.1) * 3));
            const yOffset = Math.max(0, (1 - cardProgress) * (50 + i * 15));
            const opacity = Math.min(1, cardProgress * 1.5);

            return (
              <div
                key={tier.name}
                className={cn(
                  "relative rounded-2xl p-8 flex flex-col hover-lift",
                  tier.featured
                    ? "gradient-border bg-card"
                    : "border border-border/50 bg-card/50"
                )}
                style={{
                  transform: `translateY(${yOffset}px)`,
                  opacity,
                  transition: "transform 0.1s linear, opacity 0.1s linear",
                }}
              >
                {tier.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-foreground px-4 py-1 text-[10px] font-medium text-background tracking-wider uppercase">
                    Most Popular
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    {tier.name}
                  </h3>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-4xl font-bold">{tier.price}</span>
                    <span className="text-muted-foreground text-xs">
                      / campaign
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {tier.description}
                  </p>
                </div>

                <div className="divider mb-6" />

                <ul className="space-y-3 mb-8 flex-1">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm">
                      <Check className="h-3.5 w-3.5 text-foreground/40 mt-0.5 shrink-0" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                <a
                  href="/contact"
                  className={cn(
                    "inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-medium transition-all duration-300",
                    tier.featured
                      ? "btn-shimmer bg-foreground text-background hover:glow-white-strong"
                      : "border border-border/50 text-foreground hover:bg-foreground/5 hover:border-foreground/20"
                  )}
                >
                  {tier.cta}
                  <ArrowRight size={14} />
                </a>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
