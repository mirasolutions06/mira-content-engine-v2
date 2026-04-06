"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export function CTASection() {
  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative gradient-border rounded-3xl bg-card p-12 sm:p-20 text-center overflow-hidden"
        >
          {/* Subtle radial glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-foreground/[0.03] rounded-full blur-3xl -translate-y-1/2" />

          <div className="relative">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
              Ready to transform
              <br />
              your content?
            </h2>
            <p className="mt-6 text-muted-foreground max-w-xl mx-auto">
              Tell us about your brand. We&apos;ll show you what campaign-grade
              AI content production looks like.
            </p>
            <div className="mt-10">
              <a
                href="/contact"
                className="btn-shimmer inline-flex items-center gap-2 rounded-full bg-foreground px-8 py-4 text-sm font-medium text-background glow-white hover:glow-white-strong transition-all duration-300"
              >
                Start Your Campaign
                <ArrowRight size={16} />
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
