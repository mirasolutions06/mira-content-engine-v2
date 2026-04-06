"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";

const testimonials = [
  {
    quote:
      "The image quality blew us away. We expected decent AI output — we got campaign-grade photography.",
    name: "Sarah Chen",
    role: "Founder, Glow Lab Skincare",
    rating: 5,
  },
  {
    quote:
      "One brief, and we had a week's worth of content for every platform. The copy was actually good.",
    name: "Marcus Williams",
    role: "Marketing Director",
    rating: 5,
  },
  {
    quote:
      "The monetization strategy alone paid for the package. Real affiliate programs, real numbers.",
    name: "Priya Sharma",
    role: "E-commerce Brand Owner",
    rating: 5,
  },
];

export function SocialProof() {
  return (
    <section className="py-32 sm:py-40">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-xs font-mono text-muted-foreground tracking-widest uppercase mb-4">
            Testimonials
          </p>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight">
            Trusted by brands.
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="rounded-2xl border border-border/50 bg-card/50 p-8 hover-lift relative overflow-hidden group"
            >
              {/* Decorative large quote mark */}
              <div className="absolute -top-2 -left-1 text-7xl font-serif text-foreground/[0.03] select-none leading-none">
                &ldquo;
              </div>

              <div className="relative">
                <div className="flex gap-0.5 mb-5">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star
                      key={j}
                      size={12}
                      className="fill-foreground/30 text-foreground/30"
                    />
                  ))}
                </div>
                <p className="text-foreground/70 text-sm leading-relaxed mb-8">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="divider mb-5" />
                <div>
                  <div className="font-medium text-sm">{t.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{t.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
