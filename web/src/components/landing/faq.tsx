"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const faqs = [
  {
    q: "What do I need to provide?",
    a: "Your brand name, what you sell, and optionally: reference images, brand colors, competitor URLs, and target audience. The more context you give, the better the output — but we can work with just a name and a product.",
  },
  {
    q: "How long does it take?",
    a: "Image-only campaigns deliver in 24-48 hours. Full packages with video, copy, and monetization take 3-5 business days. Rush delivery is available for an additional fee.",
  },
  {
    q: "What platforms do you create content for?",
    a: "Instagram (feed, stories, reels), TikTok, LinkedIn, YouTube (Shorts and full), Twitter/X, and ad networks. Each platform gets purpose-built copy with proper formatting, character limits, and hashtag research.",
  },
  {
    q: "Are revisions included?",
    a: "Yes. Each package includes 1-3 revision rounds depending on tier. You review storyboard frames before we generate expensive video, so revisions are typically minor.",
  },
  {
    q: "What image formats do I get?",
    a: "Story (9:16), Square (1:1), and Landscape (16:9) — the three formats that cover every social platform. Each scene can be a different format, or you can get all three for maximum flexibility.",
  },
  {
    q: "Is this just AI slop?",
    a: "No. Every image is scored on a 5-point scale for model accuracy, product accuracy, composition, and artifacts. Our average QA score is 4.7/5. An AI Director enriches each prompt with cinematography direction — camera specs, lighting setups, colour grading — before generation. Bad outputs get rejected and regenerated.",
  },
  {
    q: "Do I own the content?",
    a: "Yes. All generated content is yours to use commercially, forever. No licensing fees, no attribution required.",
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="py-24 sm:py-32">
      <div className="mx-auto max-w-3xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-xs font-mono text-muted-foreground tracking-widest uppercase mb-4">
            FAQ
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Frequently asked questions
          </h2>
        </motion.div>

        <div className="space-y-2">
          {faqs.map((faq, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.04 }}
              className={cn(
                "rounded-xl border bg-card/50 overflow-hidden transition-colors duration-300",
                openIndex === i
                  ? "border-foreground/10"
                  : "border-border/30"
              )}
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                aria-expanded={openIndex === i}
                aria-controls={`faq-answer-${i}`}
                className="w-full flex items-center justify-between p-5 text-left group"
              >
                <span className="font-medium pr-4 text-sm group-hover:text-foreground transition-colors">
                  {faq.q}
                </span>
                <ChevronDown
                  size={16}
                  className={cn(
                    "shrink-0 text-muted-foreground transition-transform duration-300",
                    openIndex === i && "rotate-180"
                  )}
                />
              </button>
              <div
                id={`faq-answer-${i}`}
                role="region"
                className={cn(
                  "overflow-hidden transition-all duration-300",
                  openIndex === i ? "max-h-96 pb-5" : "max-h-0"
                )}
              >
                <div className="px-5">
                  <div className="divider mb-4" />
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {faq.a}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
