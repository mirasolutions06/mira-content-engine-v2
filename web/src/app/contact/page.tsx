"use client";

import { useState } from "react";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { ArrowRight, ArrowLeft, CheckCircle, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

const platforms = [
  "Instagram",
  "TikTok",
  "LinkedIn",
  "YouTube",
  "Twitter/X",
  "Facebook Ads",
];

const contentTypes = [
  { value: "brand-images", label: "Images Only", description: "Brand photography for social feeds" },
  { value: "video", label: "Video", description: "Short-form video with voiceover & captions" },
  { value: "full", label: "Full Package", description: "Images + video + copy + monetization" },
];

const tiers = [
  { value: "starter", label: "Starter — £497", description: "5–7 images, 3 platforms" },
  { value: "growth", label: "Growth — £997", description: "Images + video, all platforms" },
  { value: "premium", label: "Premium — £1,997", description: "Full campaign + monetization" },
];

export default function ContactPage() {
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    brandName: "",
    website: "",
    description: "",
    targetPlatforms: [] as string[],
    contentMode: "",
    audience: "",
    competitorUrls: "",
    tier: "",
    notes: "",
    email: "",
    name: "",
  });

  const updateField = (field: string, value: string | string[]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const togglePlatform = (platform: string) => {
    setForm((prev) => ({
      ...prev,
      targetPlatforms: prev.targetPlatforms.includes(platform)
        ? prev.targetPlatforms.filter((p) => p !== platform)
        : [...prev.targetPlatforms, platform],
    }));
  };

  const handleSubmit = () => {
    // In production, this would POST to /api/briefs
    setSubmitted(true);
  };

  const canAdvance = () => {
    switch (step) {
      case 0:
        return form.brandName && form.description && form.email;
      case 1:
        return form.targetPlatforms.length > 0 && form.contentMode;
      case 2:
        return true; // optional step
      case 3:
        return form.tier;
      default:
        return false;
    }
  };

  if (submitted) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen flex items-center justify-center px-6">
          <div className="text-center max-w-md">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
              <CheckCircle className="h-8 w-8 text-accent" />
            </div>
            <h1 className="text-3xl font-bold">Brief received.</h1>
            <p className="mt-4 text-muted-foreground">
              We&apos;ll review your brief and get back to you within 24 hours
              with a creative direction proposal and timeline.
            </p>
            <a
              href="/"
              className="mt-8 inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-medium hover:bg-muted transition-colors"
            >
              Back to Home
            </a>
          </div>
        </main>
      </>
    );
  }

  const steps = [
    // Step 0: Brand basics
    <div key="basics" className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Tell us about your brand</h2>
        <p className="mt-2 text-muted-foreground">
          The basics we need to get started.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Your name</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => updateField("name", e.target.value)}
            placeholder="Jane Smith"
            className="w-full rounded-lg border border-border bg-muted px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Email *</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => updateField("email", e.target.value)}
            placeholder="jane@brand.com"
            className="w-full rounded-lg border border-border bg-muted px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">
            Brand / product name *
          </label>
          <input
            type="text"
            value={form.brandName}
            onChange={(e) => updateField("brandName", e.target.value)}
            placeholder="Glow Lab"
            className="w-full rounded-lg border border-border bg-muted px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Website</label>
          <input
            type="url"
            value={form.website}
            onChange={(e) => updateField("website", e.target.value)}
            placeholder="https://glowlab.com"
            className="w-full rounded-lg border border-border bg-muted px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">
            What do you sell? *
          </label>
          <textarea
            value={form.description}
            onChange={(e) => updateField("description", e.target.value)}
            placeholder="Organic skincare serums for women 25-40. Our hero product is a vitamin C brightening serum..."
            rows={3}
            className="w-full rounded-lg border border-border bg-muted px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent resize-none"
          />
        </div>
      </div>
    </div>,

    // Step 1: Content goals
    <div key="goals" className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Content goals</h2>
        <p className="mt-2 text-muted-foreground">
          What platforms and content types do you need?
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-3">
          Target platforms *
        </label>
        <div className="flex flex-wrap gap-2">
          {platforms.map((platform) => (
            <button
              key={platform}
              onClick={() => togglePlatform(platform)}
              className={cn(
                "rounded-full border px-4 py-2 text-sm transition-colors",
                form.targetPlatforms.includes(platform)
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border text-muted-foreground hover:border-accent/50"
              )}
            >
              {platform}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-3">
          Content type *
        </label>
        <div className="space-y-3">
          {contentTypes.map((type) => (
            <button
              key={type.value}
              onClick={() => updateField("contentMode", type.value)}
              className={cn(
                "w-full rounded-lg border p-4 text-left transition-colors",
                form.contentMode === type.value
                  ? "border-accent bg-accent/5"
                  : "border-border hover:border-accent/50"
              )}
            >
              <div className="font-medium">{type.label}</div>
              <div className="text-sm text-muted-foreground">
                {type.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Target audience
        </label>
        <input
          type="text"
          value={form.audience}
          onChange={(e) => updateField("audience", e.target.value)}
          placeholder="Women 25-40 interested in clean beauty"
          className="w-full rounded-lg border border-border bg-muted px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </div>
    </div>,

    // Step 2: Visual direction
    <div key="visual" className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Visual direction</h2>
        <p className="mt-2 text-muted-foreground">
          Optional but helpful — reference images and competitors.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Reference images
        </label>
        <div className="rounded-lg border-2 border-dashed border-border p-8 text-center">
          <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            Drag product photos, mood boards, or competitor examples here
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            (File upload available after launch — for now, describe them below or email them to us)
          </p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Competitor URLs
        </label>
        <textarea
          value={form.competitorUrls}
          onChange={(e) => updateField("competitorUrls", e.target.value)}
          placeholder="https://competitor1.com&#10;https://instagram.com/competitor2"
          rows={3}
          className="w-full rounded-lg border border-border bg-muted px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Additional notes
        </label>
        <textarea
          value={form.notes}
          onChange={(e) => updateField("notes", e.target.value)}
          placeholder="Brand colors, specific products to feature, visual style preferences, things to avoid..."
          rows={4}
          className="w-full rounded-lg border border-border bg-muted px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent resize-none"
        />
      </div>
    </div>,

    // Step 3: Package selection
    <div key="package" className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Choose your package</h2>
        <p className="mt-2 text-muted-foreground">
          Pick the package that matches your needs.
        </p>
      </div>

      <div className="space-y-3">
        {tiers.map((tier) => (
          <button
            key={tier.value}
            onClick={() => updateField("tier", tier.value)}
            className={cn(
              "w-full rounded-lg border p-5 text-left transition-colors",
              form.tier === tier.value
                ? "border-accent bg-accent/5"
                : "border-border hover:border-accent/50"
            )}
          >
            <div className="font-medium">{tier.label}</div>
            <div className="text-sm text-muted-foreground mt-1">
              {tier.description}
            </div>
          </button>
        ))}
      </div>
    </div>,
  ];

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-24 pb-20 px-6">
        <div className="mx-auto max-w-xl">
          {/* Progress */}
          <div className="flex gap-2 mb-10">
            {["Brand", "Goals", "Visual", "Package"].map((label, i) => (
              <div key={label} className="flex-1">
                <div
                  className={cn(
                    "h-1 rounded-full transition-colors",
                    i <= step ? "bg-accent" : "bg-border"
                  )}
                />
                <div
                  className={cn(
                    "text-xs mt-2 transition-colors",
                    i <= step ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {label}
                </div>
              </div>
            ))}
          </div>

          {/* Current step */}
          {steps[step]}

          {/* Navigation */}
          <div className="flex justify-between mt-10">
            {step > 0 ? (
              <button
                onClick={() => setStep(step - 1)}
                className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-medium hover:bg-muted transition-colors"
              >
                <ArrowLeft size={14} />
                Back
              </button>
            ) : (
              <div />
            )}

            {step < steps.length - 1 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={!canAdvance()}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium transition-colors",
                  canAdvance()
                    ? "bg-accent text-white hover:bg-accent/90"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                )}
              >
                Next
                <ArrowRight size={14} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!canAdvance()}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full px-8 py-3 text-sm font-medium transition-colors",
                  canAdvance()
                    ? "bg-accent text-white hover:bg-accent/90"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                )}
              >
                Submit Brief
                <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
