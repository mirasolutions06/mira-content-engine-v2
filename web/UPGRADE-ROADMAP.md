# Mira Content Engine — Upgrade Roadmap

> One brief in, platform-ready content out. These upgrades make the output better, the input easier, the pipeline faster, and the engine smarter over time.

---

## Table of Contents

1. [Better Output — Quality & Consistency](#1-better-output--quality--consistency)
2. [Easier Input — Remove Friction](#2-easier-input--remove-friction)
3. [Faster Output — Speed & Parallelism](#3-faster-output--speed--parallelism)
4. [More Leverage — Multiply Output per Run](#4-more-leverage--multiply-output-per-run)
5. [Backend Architecture Upgrades](#5-backend-architecture-upgrades)
6. [Mira Memory — Continuous Learning System](#6-mira-memory--continuous-learning-system)
7. [Implementation Priority & Phases](#7-implementation-priority--phases)

---

## 1. Better Output — Quality & Consistency

### 1.1 Multi-Image Style Lock

**Problem:** Scene 1 is the sole "style anchor" — if it's mediocre, every subsequent scene inherits that weakness.

**Solution:** Build a rolling context window. Feed previously generated scenes back as style references for upcoming ones. Gemini supports up to 14 reference images — use that capacity.

**Implementation:**
```
Scene 1: refs = [product.jpg, style.jpg]
Scene 2: refs = [product.jpg, style.jpg, scene-1-output.png]
Scene 3: refs = [product.jpg, style.jpg, scene-1-output.png, scene-2-output.png]
```

**Files to modify:**
- `src/pipeline/storyboard.ts` — accept array of previous output frames as additional references
- `src/pipeline/index.ts` — pass accumulated frame outputs into next scene generation
- `src/pipeline/brand-images.ts` — same pattern for brand-image mode

**Effort:** 2-3 hours | **Impact:** High — dramatically improves visual coherence across scenes

---

### 1.2 Generate-Evaluate-Regenerate Loop

**Problem:** Frames are generated once and accepted blindly. Bad frames become bad videos ($2-6 wasted per clip).

**Solution:** Wire `src/utils/image-qa.ts` into the main pipeline loop with automatic regeneration.

**Implementation:**
```
Generate frame
    → Evaluate with Haiku vision ($0.02)
    → Score against criteria:
        - Style match to Director summary
        - Subject consistency with references
        - Composition for target format
        - Artifact detection (extra limbs, text, blur)
    → Score < 7/10? → Regenerate with evaluation feedback appended to prompt
    → Cap at 2 retries, then accept best attempt
```

**Files to modify:**
- `src/pipeline/index.ts` — add QA gate after frame generation in Phase 1
- `src/utils/image-qa.ts` — add `evaluateFrame()` function returning score + feedback
- `src/types/index.ts` — add `QAResult` type

**Effort:** 3 hours | **Impact:** High — prevents 80% of "bad frame → wasted video" scenarios

---

### 1.3 Provider-Specific Video Prompts

**Problem:** Same video prompt is sent to Kling and Veo, but they respond very differently.

**Solution:** Add provider-aware prompt formatting in the Director.

| Provider | Optimal Prompt Style |
|----------|---------------------|
| Kling v2.1 | Short motion directives: "slow dolly in, ambient light shifts" |
| Kling v3 | Scene context + motion: "woman holding jar, gentle camera orbit right" |
| Veo 3.1 | Rich atmospheric description + camera language: full scene painting |

**Files to modify:**
- `src/pipeline/director.ts` — add provider-specific enrichment rules to system prompt
- `src/pipeline/index.ts` — pass videoProvider to Director step

**Effort:** 1-2 hours | **Impact:** Medium — noticeably better video quality per provider

---

### 1.4 Default to Kling v3 Multi-Shot

**Problem:** `generateV3MultiShot()` already exists in `fal.ts` but is never called by the main pipeline. Individual clip generation creates visual discontinuity between scenes.

**Solution:** When using Kling v3 with ≤6 clips and ≤15s total, automatically route to multi-shot mode. Kling v3 renders all shots in a unified latent space — consistent lighting, color, subject across all clips.

**Files to modify:**
- `src/pipeline/index.ts` — add multi-shot routing logic in Phase 2
- `src/pipeline/fal.ts` — minor adjustments to multi-shot cache integration

**Effort:** 2 hours | **Impact:** Very high — biggest consistency upgrade available, code already written

---

### 1.5 Intelligent cfg_scale per Scene Type

**Problem:** `cfg_scale` is hardcoded (0.65 for t2v, 0.7 for i2v). Different scene types need different adherence levels.

**Solution:**
| Scene Type | cfg_scale | Reasoning |
|-----------|-----------|-----------|
| Product hero shot | 0.80 | Maximum fidelity to storyboard — this is the money shot |
| Lifestyle / context | 0.60 | Allow natural movement and atmosphere |
| Close-up detail | 0.75 | Preserve texture but allow subtle motion |
| CTA / final | 0.70 | Balanced — needs to look polished |

**Files to modify:**
- `src/pipeline/director.ts` — have Director suggest cfg_scale per clip
- `src/types/index.ts` — add `cfgScale` to `DirectorClipPlan`
- `src/pipeline/fal.ts` and `src/pipeline/veo.ts` — read from clip plan

**Effort:** 1 hour | **Impact:** Medium — fine-tuning that compounds over many runs

---

## 2. Easier Input — Remove Friction

### 2.1 URL-to-Brief

**Problem:** Creating a config.json requires understanding the schema, writing prompts, choosing formats.

**Solution:** Paste a product/brand URL → engine scrapes everything → auto-generates complete config.

**Implementation:**
```
User: "Create content for https://amashea.com/whipped-butter"

Engine:
  1. Fetch page → extract product name, description, price, images
  2. Download hero images → product.jpg, product-1.jpg
  3. Extract brand colors from CSS/meta → brand.json
  4. Analyze competitor aesthetics (optional web search)
  5. Generate config.json with:
     - brand, title, brief from page content
     - script from product description
     - clip prompts from product imagery
     - format auto-selected based on platforms detected
  6. Show cost estimate → ask for approval
```

**New files:**
- `src/pipeline/url-scraper.ts` — page scraping + product extraction
- `src/pipeline/brief-builder.ts` — URL analysis → config.json generation
- Update `skills/brief-generator/SKILL.md` — add URL-to-brief as primary flow

**Effort:** 4-5 hours | **Impact:** Very high — removes the entire input bottleneck

---

### 2.2 Template Library

**Problem:** Users don't know what clip sequences work best for their content type.

**Solution:** Pre-built templates for common use cases.

**New file:** `projects/_templates/`
```
projects/_templates/
├── product-launch.json     → hero → features → lifestyle → CTA
├── testimonial.json        → face intro → product → result → CTA
├── before-after.json       → problem → transition → solution → CTA
├── unboxing.json           → package → reveal → close-up → lifestyle
├── brand-story.json        → origin → process → product → mission
├── tutorial.json           → intro → step 1 → step 2 → result
└── seasonal-promo.json     → mood scene → product → offer → urgency CTA
```

Each template has placeholder prompts that the Director rewrites for the brand. User picks a template, fills in brand/product, done.

**Files to modify:**
- `src/cli/new-project.ts` — add `--template` flag
- `skills/brief-generator/SKILL.md` — offer template selection as first step

**Effort:** 2-3 hours | **Impact:** High — dramatically simplifies first-time usage

---

### 2.3 Three-Question Brief Flow

**Problem:** The brief generator skill can ask too many questions upfront.

**Solution:** Default to 3 questions only:
1. "What's the brand and product?"
2. "Who's the audience and what platform?"
3. "Any reference? (URL, image, or vibe word like 'luxurious')"

Everything else is inferred by the Director. The skill should generate the config from these 3 answers alone.

**Files to modify:**
- `skills/brief-generator/SKILL.md` — restructure as 3-question default flow
- Advanced options available but never prompted unless user asks

**Effort:** 1 hour | **Impact:** Medium — UX improvement for brief creation

---

## 3. Faster Output — Speed & Parallelism

### 3.1 Parallel Video Generation

**Problem:** Phase 2 generates clips sequentially. A 5-clip project takes ~15 min instead of ~5 min.

**Solution:** Generate all video clips in parallel with a concurrency limiter.

**Implementation:**
```typescript
// src/utils/concurrency.ts
export async function parallelWithLimit<T>(
  tasks: (() => Promise<T>)[],
  concurrency: number,
): Promise<T[]> { ... }

// In index.ts Phase 2:
const clipResults = await parallelWithLimit(
  videoPlans.map(plan => () => generateClip(plan)),
  3, // max 3 concurrent API calls
);
```

**New files:**
- `src/utils/concurrency.ts` — generic parallel limiter

**Files to modify:**
- `src/pipeline/index.ts` — replace sequential Phase 2 loop with parallel execution

**Effort:** 2 hours | **Impact:** Very high — 3-5x faster pipeline completion

---

### 3.2 Parallel Voiceover + Video

**Problem:** Voiceover → Whisper → Video is fully sequential, but voiceover and video are independent.

**Solution:**
```
After storyboard approval:
  ┌── ElevenLabs voiceover → Whisper transcription
  │
  └── Video clip generation (all clips parallel)
  
  Both streams complete → Remotion render
```

**Files to modify:**
- `src/pipeline/index.ts` — restructure Phase 2 as concurrent streams with `Promise.all()`

**Effort:** 1 hour (on top of 3.1) | **Impact:** Medium — saves 30-60s per run

---

### 3.3 Tiered Preview Pipeline

**Problem:** Gap between "storyboard-only" (cheap but static) and "full generation" (expensive).

**Solution:** Add a `--draft` tier.

| Tier | Flag | What | Cost | Time |
|------|------|------|------|------|
| Preview | `--storyboard-only` | Frames only | ~$0.40 | 30s |
| **Draft** | `--draft` | Frames + Kling v2.1 5s + no voiceover | **~$3** | **3-5min** |
| Final | (default) | Full pipeline | ~$10-20 | 10-15min |

Draft mode forces: `kling-v2.1`, 5s clips, skips voiceover/captions, skips Remotion render (outputs raw clips).

**Files to modify:**
- `src/cli/run-pipeline.ts` — add `--draft` flag
- `src/types/index.ts` — add `draft` to `RunOptions`
- `src/pipeline/index.ts` — draft mode shortcuts

**Effort:** 2 hours | **Impact:** High — lets users iterate cheaply before committing

---

## 4. More Leverage — Multiply Output per Run

### 4.1 One Brief → Multi-Format Render

**Problem:** One pipeline run produces one video format. Getting a YouTube Short AND an Instagram Reel AND a landscape ad requires 3 runs (3x the Kling cost).

**Solution:** Generate clips once, render multiple Remotion compositions.

**Implementation:**
```
config.json:
{
  "outputFormats": ["youtube-short", "ad-16x9", "ad-1x1"],
  ...
}

Pipeline:
  1. Generate storyboard frames (once)
  2. Generate video clips (once) — format-agnostic
  3. Render via Remotion:
     - YoutubeShort composition → 9:16 output
     - Ad composition (16:9) → landscape output
     - Ad composition (1:1) → square output
  4. Package all formats together
```

Video clips and voiceover are the expensive parts — Remotion renders are free. One Kling bill, 3-4 deliverables.

**Files to modify:**
- `src/types/index.ts` — add `outputFormats` to `VideoConfig`
- `src/pipeline/index.ts` — loop Remotion render step over multiple formats
- `src/pipeline/export.ts` — name files with format suffix

**Effort:** 3-4 hours | **Impact:** Very high — 3-4x output per dollar spent

---

### 4.2 A/B Variant Generation

**Problem:** Social media performance depends on hooks and CTAs, but the engine produces one version.

**Solution:** Generate variant packages for testing.

```
config.json:
{
  "variants": {
    "hooks": 3,    // generate 3 different hook texts
    "ctas": 2,     // generate 2 different CTAs
    "thumbnails": 3 // crop 3 thumbnail variants
  }
}
```

The Director generates multiple hook/CTA options. Remotion renders each combination. Output:
```
output/variants/
├── hook-a-cta-1/final.mp4
├── hook-a-cta-2/final.mp4
├── hook-b-cta-1/final.mp4
└── thumbnails/
    ├── thumb-close.jpg
    ├── thumb-wide.jpg
    └── thumb-text.jpg
```

**Files to modify:**
- `src/pipeline/director.ts` — generate variant hooks/CTAs
- `src/types/index.ts` — add `VariantConfig`
- `src/pipeline/index.ts` — variant render loop
- Remotion compositions — accept variant props

**Effort:** 5-6 hours | **Impact:** High — huge value for social media content creators

---

### 4.3 Auto-Thumbnail Extraction

**Problem:** Users need thumbnails for YouTube/social but have to manually screenshot frames.

**Solution:** Automatically extract the best frame from each clip + generate text-overlay variants.

**Implementation:**
- Use Haiku vision to score frames from each clip for "thumbnail quality" (high contrast, clear subject, good composition)
- Export top-scoring frame from each scene as PNG
- Generate 2-3 text-overlay variants using Remotion (with hook text, brand logo)
- Save to `output/thumbnails/`

**New files:**
- `src/pipeline/thumbnail-extractor.ts`

**Effort:** 3 hours | **Impact:** Medium — saves manual work, professional output

---

## 5. Backend Architecture Upgrades

### 5.1 Break Up the God Function

**Problem:** `runPipeline()` in `index.ts` is 777 lines — impossible to test, debug, or extend individually.

**Refactor:**
```
src/pipeline/
├── index.ts              → orchestrator (~80 lines, calls phases in order)
├── phases/
│   ├── validate.ts       → config validation + env checks
│   ├── plan.ts           → Director + asset sourcing + prompt enrichment
│   ├── storyboard.ts     → Phase 1: serial frame generation + QA
│   ├── video-gen.ts      → Phase 2: parallel clip generation
│   ├── render.ts         → Remotion bundling + rendering
│   └── package.ts        → ffmpeg packaging + Airtable logging
├── providers/
│   ├── kling.ts          → fal.ts renamed, Kling-specific
│   ├── veo.ts            → unchanged
│   └── provider-router.ts → replaces hardcoded if/else chains
```

Each phase exports a single function with typed inputs/outputs. The orchestrator becomes:
```typescript
export async function runPipeline(projectName: string, opts?: RunOptions) {
  const ctx = await validate(projectName, opts);
  const plan = await plan(ctx);
  const storyboard = await generateStoryboard(ctx, plan);
  if (opts?.storyboardOnly) return storyboard;
  const clips = await generateVideos(ctx, plan, storyboard);
  const rendered = await render(ctx, clips);
  return package(ctx, rendered);
}
```

**Effort:** 4-5 hours | **Impact:** Foundation for everything else — makes all other upgrades easier

---

### 5.2 Pipeline Context Object

**Problem:** Functions pass 5-8 individual parameters. Adding a new parameter means changing every function signature.

**Solution:** Create a `PipelineContext` that flows through all phases.

```typescript
// src/types/index.ts
export interface PipelineContext {
  projectName: string;
  projectDir: string;
  projectsRoot: string;
  config: VideoConfig;
  mode: PipelineMode;
  costTracker: CostTracker;
  runOpts: RunOptions;
  assets: ProjectAssets;
  memory: BrandMemory | null;      // from §6
  directorPlan: DirectorPlan | null;
  generatedFrames: Map<number, string>;
  generatedClips: Map<number, string>;
  startTime: number;
}
```

Every phase function takes `ctx: PipelineContext` and returns an updated context. No more threading 8 parameters through every call.

**Effort:** 3 hours | **Impact:** High — dramatically simplifies code and enables testing

---

### 5.3 Retry with Exponential Backoff

**Problem:** One API failure kills the entire pipeline. Transient network errors waste previously completed work.

**Solution:**
```typescript
// src/utils/retry.ts
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  opts: { attempts?: number; delayMs?: number; label?: string } = {},
): Promise<T> {
  const { attempts = 3, delayMs = 3000, label = 'operation' } = opts;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === attempts) throw err;
      const wait = delayMs * Math.pow(2, i - 1);
      logger.warn(`${label} failed (attempt ${i}/${attempts}). Retrying in ${wait}ms...`);
      await new Promise(r => setTimeout(r, wait));
    }
  }
  throw new Error('unreachable');
}
```

Wrap all external API calls: `generateFalClip`, `generateVeoClip`, `generateVoiceover`, `generateStoryboardFrame`.

**Effort:** 1 hour | **Impact:** High — prevents lost money on transient failures

---

### 5.4 Dependency Injection for API Clients

**Problem:** API clients are initialized inside each module with `process.env` reads. Impossible to mock for testing.

**Solution:**
```typescript
// src/pipeline/clients.ts
export interface APIClients {
  gemini: GoogleGenAI;
  anthropic: Anthropic;
  fal: typeof fal;
  openai: OpenAI;
  elevenlabs: ElevenLabsClient;
}

export function createClients(): APIClients {
  return {
    gemini: new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }),
    anthropic: new Anthropic(),
    // ...
  };
}
```

Pass `clients` through `PipelineContext`. In tests, inject mocks.

**Effort:** 3 hours | **Impact:** Medium — enables proper testing

---

### 5.5 Unified Cache System

**Problem:** `cache/fal-cache.json` is named for one provider but used by all. Cache hash for Kling uses `klingVersion` while Veo uses `provider` — different key names for the same concept.

**Solution:**
- Rename to `cache/clip-cache.json`
- Normalize cache hash to always include `provider` field:
  ```typescript
  hashVideoRequest(prompt, { ...opts, provider: 'kling-v3' })
  ```
- Add cache TTL (optional) — clips older than 30 days can be flagged for review
- Add `cache stats` CLI command to show total cached value saved

**Files to modify:**
- `src/utils/cache.ts` — rename, add provider normalization
- `src/pipeline/fal.ts` — use unified provider key
- `src/pipeline/veo.ts` — already uses provider, just align naming

**Effort:** 1 hour | **Impact:** Medium — prevents subtle cache bugs

---

### 5.6 Structured Logging

**Problem:** Emoji logger is nice for CLI but has no levels, no file output, no structured data for debugging.

**Solution:**
```typescript
// Enhanced logger.ts
export const logger = {
  debug: (msg: string, data?: Record<string, unknown>) => { ... },
  info: (msg: string, data?: Record<string, unknown>) => { ... },
  warn: (msg: string, data?: Record<string, unknown>) => { ... },
  error: (msg: string, data?: Record<string, unknown>) => { ... },
  step: (msg: string) => { ... },
  success: (msg: string) => { ... },
};
```

- Respect `LOG_LEVEL` env var (`debug | info | warn | error`)
- Write JSON log to `cache/run-log.json` per project per run
- Include timestamps, step names, durations, costs as structured data
- Keep emoji output for CLI (human-readable), add JSON output for debugging

**Effort:** 2 hours | **Impact:** Medium — essential for debugging production issues

---

### 5.7 Add Tests

**Problem:** Zero tests. One bad refactor could silently break caching and regenerate expensive clips.

**Solution:** Use Vitest (zero config with TypeScript/ESM).

**Priority test coverage:**
```
tests/
├── unit/
│   ├── validate.test.ts         → config validation edge cases
│   ├── cost-tracker.test.ts     → cost estimation accuracy
│   ├── cache.test.ts            → hash determinism, manifest I/O
│   ├── prompt-validator.test.ts → prompt length, content checks
│   └── retry.test.ts            → backoff timing, failure handling
├── integration/
│   ├── dry-run.test.ts          → full --dry-run produces valid JSON output
│   ├── config-modes.test.ts     → brand-images / video / full routing
│   └── director-parse.test.ts   → Director JSON parsing with edge cases
└── fixtures/
    ├── valid-config.json
    ├── invalid-config.json
    └── mock-director-response.json
```

**Effort:** 4-5 hours | **Impact:** High — safety net for all future changes

---

## 6. Mira Memory — Continuous Learning System

> The engine should get smarter with every run, not start from scratch each time.

This is the most transformative upgrade. Instead of just "brand memory" (static preferences), build a **learning system** that accumulates knowledge at three levels: brand, skill, and engine.

### 6.1 Architecture Overview

```
memory/
├── brands/                          ← Brand-level memory (per brand)
│   └── ama-shea/
│       ├── brand-dna.json           ← Core identity, colors, tone, audience
│       ├── prompt-scores.json       ← Which prompts produced best results
│       ├── style-anchors/           ← Best-performing generated images
│       ├── voice-profile.json       ← Optimal voice settings
│       └── run-history.json         ← All runs with scores + costs
│
├── skills/                          ← Skill-level memory (cross-brand)
│   ├── prompt-patterns.json         ← Prompt patterns that consistently score high
│   ├── provider-insights.json       ← Per-provider learnings (what works on Kling vs Veo)
│   ├── format-playbooks.json        ← Which clip sequences work best per format
│   └── failure-patterns.json        ← Common failures and how to avoid them
│
└── engine/                          ← Engine-level memory (global intelligence)
    ├── cost-benchmarks.json         ← Average cost per project type
    ├── quality-baselines.json       ← Expected QA scores by scene type
    ├── model-performance.json       ← Which AI models perform best for what
    └── optimization-log.json        ← Tracked improvements over time
```

---

### 6.2 Brand Memory — Per-Brand Learning

**What it stores:**
```json
{
  "brand": "Ama Shea",
  "brandDna": {
    "colors": { "primary": "#C4883D", "secondary": "#2C1810", "accent": "#F5E6D0" },
    "tone": "warm, luxurious, heritage-rooted, authentic",
    "audience": "women 25-40, clean beauty, cultural heritage",
    "visualIdentity": "warm amber lighting, dark wood textures, West African textiles, shallow depth of field",
    "avoidList": ["clinical/sterile aesthetics", "cool blue tones", "minimalist white"]
  },
  "promptScores": [
    {
      "prompt": "Glass jar of whipped ivory shea butter on dark cracked wood...",
      "qaScore": 9.2,
      "provider": "gemini",
      "format": "story",
      "runId": "2026-03-14-run-1",
      "tags": ["product-hero", "high-score"]
    }
  ],
  "styleAnchors": ["style-anchors/best-scene1-2026-03.png"],
  "voiceProfile": {
    "preferredVoiceId": "pNInz6obpgDQGcFmaJgB",
    "optimalSettings": { "stability": 0.55, "similarityBoost": 0.80, "style": 0.3 },
    "tone": "warm, confident, storytelling"
  },
  "learnedPreferences": {
    "bestShotSequence": ["extreme-close-up", "close-up", "medium", "detail"],
    "optimalClipCount": 4,
    "preferredTransition": "crossfade",
    "bestCfgScale": { "hero": 0.80, "lifestyle": 0.60 }
  }
}
```

**How it learns:**
1. After each run, the QA system scores every generated frame
2. Top-scoring frames (≥8/10) are saved as `style-anchors/` — used as references in future runs
3. Prompt patterns from high-scoring scenes are extracted and saved
4. Voice settings that the user approves are recorded
5. The Director reads brand memory before planning — starts from a higher baseline each time

**Key principle:** The 5th campaign for Ama Shea should produce noticeably better results than the 1st, without the user doing anything different.

---

### 6.3 Skill Memory — Cross-Brand Pattern Learning

**What it stores:**

```json
// memory/skills/prompt-patterns.json
{
  "highScorePatterns": [
    {
      "pattern": "Start with subject at specific distance, then lighting, then texture",
      "avgScore": 8.7,
      "sampleCount": 45,
      "example": "Close-up of glass jar on dark wood, warm amber side-light, shallow depth of field"
    },
    {
      "pattern": "Include specific material textures in product shots",
      "avgScore": 8.3,
      "sampleCount": 32,
      "antiPattern": "Generic 'product on table' descriptions score 5.2 average"
    }
  ],
  "lowScorePatterns": [
    {
      "pattern": "Prompts mentioning text, logos, or typography",
      "avgScore": 3.1,
      "action": "Auto-strip text references, warn user"
    }
  ]
}

// memory/skills/provider-insights.json
{
  "kling-v2.1": {
    "strengths": ["product shots", "slow motion", "close-ups"],
    "weaknesses": ["complex multi-person scenes", "text rendering"],
    "optimalPromptLength": { "i2v": 50, "t2v": 120 },
    "optimalCfgScale": { "i2v": 0.70, "t2v": 0.65 },
    "avgCostPerQuality": { "score8+": "$0.52", "score6-7": "$0.49" }
  },
  "veo-3.1": {
    "strengths": ["atmospheric scenes", "camera movements", "cinematic lighting"],
    "weaknesses": ["tight close-ups", "product detail fidelity"],
    "safetyFilterRate": "12% on scenes with people",
    "fallbackStrategy": "Remove image reference, retry as t2v"
  }
}

// memory/skills/format-playbooks.json
{
  "youtube-short": {
    "optimalClipCount": 3,
    "optimalTotalDuration": "12-15s",
    "bestOpeningShot": "extreme-close-up or medium with action",
    "hookTextTiming": "0-2s, ALL CAPS, ≤7 words",
    "captionTheme": "bold for engagement-focused, editorial for luxury"
  }
}
```

**How it learns:**
1. Every run contributes data — prompt, provider, format, QA score, cost, user approval/rejection
2. After every 10 runs (or on command), the engine aggregates patterns:
   - Which prompt structures consistently score high?
   - Which providers work best for which scene types?
   - Which clip sequences get the best user approval rates?
3. The Director reads skill memory to inform its decisions — it knows "close-ups of glass containers score highest with warm side-lighting" because it's seen it work 30 times before

---

### 6.4 Engine Memory — Global Intelligence

**What it stores:**
```json
// memory/engine/cost-benchmarks.json
{
  "avgCostPerProjectType": {
    "product-launch-3clip": "$4.20",
    "brand-story-5clip": "$8.50",
    "brand-images-only": "$0.80"
  },
  "costTrend": "decreasing 12% month-over-month (better prompts = fewer retries)"
}

// memory/engine/quality-baselines.json
{
  "avgQAScoreAllTime": 7.4,
  "avgQAScoreLast30Days": 8.1,
  "improvementRate": "+0.7 in 30 days",
  "topScoringProjectTypes": ["product-hero", "lifestyle"],
  "lowestScoringProjectTypes": ["multi-person", "action-sequence"]
}
```

**How it learns:**
- Tracks global quality score trends over time
- Identifies which project types the engine handles best (and worst)
- Tracks cost efficiency improvements as prompts get better
- Provides recommendations: "Your product-hero shots average 8.7/10. Your multi-person scenes average 6.2 — consider using Veo 3.1 for those."

---

### 6.5 Implementation — Memory Manager

**New files:**
```
src/memory/
├── index.ts              → MemoryManager class (read, write, query)
├── brand-memory.ts       → Brand-specific CRUD + learning
├── skill-memory.ts       → Cross-brand pattern aggregation
├── engine-memory.ts      → Global stats tracking
└── learner.ts            → Post-run analysis that extracts learnings
```

```typescript
// src/memory/index.ts
export class MemoryManager {
  private memoryRoot: string;

  constructor(projectsRoot: string) {
    this.memoryRoot = path.join(projectsRoot, '..', 'memory');
  }

  // Brand memory
  async loadBrand(brandName: string): Promise<BrandMemory | null> { ... }
  async saveBrand(brandName: string, memory: BrandMemory): Promise<void> { ... }

  // Skill memory
  async getPromptPatterns(): Promise<PromptPattern[]> { ... }
  async getProviderInsights(provider: string): Promise<ProviderInsight> { ... }
  async getFormatPlaybook(format: string): Promise<FormatPlaybook> { ... }

  // Learning — called after every run
  async learn(runResult: RunResult): Promise<LearningReport> {
    // 1. Score all generated frames
    // 2. Update brand memory with new scores + preferences
    // 3. Extract prompt patterns and update skill memory
    // 4. Update engine-level stats
    // 5. Return learning report (what was learned this run)
  }
}
```

**Integration points:**
- `src/pipeline/index.ts` — load memory at start, call `memory.learn()` at end
- `src/pipeline/director.ts` — read brand memory + skill patterns before planning
- `src/pipeline/storyboard.ts` — use style anchors from brand memory as references
- `src/pipeline/fal.ts` / `veo.ts` — read provider insights for optimal settings
- `skills/brief-generator/SKILL.md` — use brand memory to pre-populate briefs

---

### 6.6 Memory Feedback Loop

The complete learning cycle:

```
Run N:
  1. Load brand memory + skill patterns
  2. Director uses learnings to enrich prompts
  3. Generate frames (with style anchors from previous runs)
  4. QA scores all frames
  5. Generate videos
  6. User reviews output → approve/reject/rate
  7. Post-run learner:
     a. Save high-scoring frames as new style anchors
     b. Extract prompt patterns from high/low scores
     c. Update provider performance data
     d. Update cost benchmarks
     e. Update quality trend

Run N+1:
  → Director has better context
  → Storyboard has better style anchors
  → Provider settings are optimized
  → Prompts use proven patterns
  → Output is measurably better
```

---

### 6.7 Memory CLI Commands

```bash
# View brand memory
npm run memory -- --brand "ama-shea" --summary

# View what the engine has learned
npm run memory -- --insights

# Reset brand memory (start fresh)
npm run memory -- --brand "ama-shea" --reset

# Force learning from past runs
npm run memory -- --learn-from-history

# Show quality trend
npm run memory -- --quality-trend
```

---

## 7. Implementation Priority & Phases

### Phase 1 — Foundation (Week 1)
> Backend upgrades that enable everything else.

| # | Upgrade | Section | Effort | Dependencies |
|---|---------|---------|--------|--------------|
| 1 | Retry with backoff | §5.3 | 1hr | None |
| 2 | Pipeline context object | §5.2 | 3hr | None |
| 3 | Break up god function | §5.1 | 4hr | §5.2 |
| 4 | Unified cache system | §5.5 | 1hr | None |
| 5 | Add Vitest + core unit tests | §5.7 | 4hr | None |

### Phase 2 — Quality (Week 2)
> Make the output consistently better.

| # | Upgrade | Section | Effort | Dependencies |
|---|---------|---------|--------|--------------|
| 6 | Multi-image style lock | §1.1 | 3hr | None |
| 7 | Generate-evaluate-regenerate loop | §1.2 | 3hr | None |
| 8 | Default to Kling v3 multi-shot | §1.4 | 2hr | None |
| 9 | Provider-specific video prompts | §1.3 | 2hr | None |
| 10 | Intelligent cfg_scale | §1.5 | 1hr | §1.3 |

### Phase 3 — Speed & Leverage (Week 3)
> Make the pipeline faster and multiply output.

| # | Upgrade | Section | Effort | Dependencies |
|---|---------|---------|--------|--------------|
| 11 | Parallel video generation | §3.1 | 2hr | §5.1 |
| 12 | Parallel voiceover + video | §3.2 | 1hr | §3.1 |
| 13 | Tiered preview (--draft) | §3.3 | 2hr | None |
| 14 | One brief → multi-format render | §4.1 | 4hr | §5.1 |
| 15 | Auto-thumbnail extraction | §4.3 | 3hr | None |

### Phase 4 — Input & Memory (Week 4)
> Make it easy to use and smart over time.

| # | Upgrade | Section | Effort | Dependencies |
|---|---------|---------|--------|--------------|
| 16 | Template library | §2.2 | 2hr | None |
| 17 | Three-question brief flow | §2.3 | 1hr | None |
| 18 | URL-to-brief | §2.1 | 5hr | None |
| 19 | Mira Memory — brand memory | §6.2 | 4hr | §5.2 |
| 20 | Mira Memory — skill memory | §6.3 | 4hr | §6.2 |
| 21 | Mira Memory — engine memory | §6.4 | 2hr | §6.3 |
| 22 | Memory CLI commands | §6.7 | 2hr | §6.2 |
| 23 | A/B variant generation | §4.2 | 6hr | §5.1, §4.1 |

### Phase 5 — Polish (Week 5)
> Final refinements.

| # | Upgrade | Section | Effort | Dependencies |
|---|---------|---------|--------|--------------|
| 24 | Structured logging | §5.6 | 2hr | None |
| 25 | Dependency injection | §5.4 | 3hr | §5.2 |
| 26 | Integration tests | §5.7 | 3hr | §5.4 |
| 27 | Resolve or remove web/ app | — | Varies | None |

---

## Total Estimated Effort

| Phase | Focus | Hours |
|-------|-------|-------|
| Phase 1 | Foundation | ~13hr |
| Phase 2 | Quality | ~11hr |
| Phase 3 | Speed & Leverage | ~12hr |
| Phase 4 | Input & Memory | ~26hr |
| Phase 5 | Polish | ~8hr |
| **Total** | | **~70hr** |

---

## Success Metrics

Track these to prove the upgrades are working:

| Metric | Baseline (now) | Target |
|--------|---------------|--------|
| Avg QA score per frame | Unknown (no QA loop) | 8.0+ / 10 |
| Pipeline time (5-clip video) | ~15 min | ~5 min |
| Cost per deliverable | ~$10/video | ~$3.50/video (multi-format) |
| Input time (brief creation) | ~10 min | ~2 min |
| Storyboard approval rate | ~60% first try | ~85% first try |
| Pipeline failure rate | Unknown | < 5% (with retries) |
| Runs before memory improves output | N/A | 3-5 runs per brand |
