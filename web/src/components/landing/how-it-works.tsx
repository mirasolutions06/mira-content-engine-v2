"use client";

import { motion } from "framer-motion";
import {
  FileText,
  Wand2,
  PenTool,
  Package,
  TrendingUp,
} from "lucide-react";

const steps = [
  {
    icon: FileText,
    title: "Brief",
    description:
      "Tell us about your brand, products, and goals. We research your market and competitors.",
    detail: "Natural language → validated creative brief",
  },
  {
    icon: Wand2,
    title: "Generate",
    description:
      "AI creates campaign-grade images and video with cinematography direction and quality scoring.",
    detail: "Gemini + Kling + ElevenLabs orchestration",
  },
  {
    icon: PenTool,
    title: "Copy",
    description:
      "Platform-native captions, hashtags, ad copy, and email sequences — each tuned for its audience.",
    detail: "Instagram, TikTok, LinkedIn, YouTube, Ads",
  },
  {
    icon: Package,
    title: "Package",
    description:
      "Everything organized by platform with proper naming, posting schedule, and asset manifests.",
    detail: "Client-ready deliverables folder",
  },
  {
    icon: TrendingUp,
    title: "Monetize",
    description:
      "Real affiliate programs, revenue projections, and tracked links baked into your content.",
    detail: "Researched commissions, not guesswork",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Five steps. Zero guesswork.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            From your brand brief to monetized, platform-ready content — every step
            is AI-powered and human-reviewed.
          </p>
        </motion.div>

        <div className="relative">
          {/* Connection line */}
          <div className="hidden lg:block absolute top-12 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-border to-transparent" />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-6">
            {steps.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="relative text-center lg:text-left"
              >
                {/* Step number + icon */}
                <div className="mx-auto lg:mx-0 mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 border border-accent/20">
                  <step.icon className="h-5 w-5 text-accent" />
                </div>

                <div className="text-xs font-mono text-muted-foreground mb-1">
                  0{i + 1}
                </div>

                <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
                <p className="mt-2 text-xs text-accent/70 font-mono">
                  {step.detail}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
