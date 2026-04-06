# CLAUDE.md — Mira Content Engine v2

## What This Is

AI product photography and video engine. One skill, one session. Generates billboard-ready brand images and video from a brief + reference photos.

## Architecture

```
content-engine skill (1 unified skill)
    ↓
Phase 1: Understand — product, model, refs, how light hits each material
Phase 2: Translate  — vision + physics → photography-grade config.json
Phase 3: Generate   — run pipeline, review, iterate
```

One video provider (Higgsfield). One image provider (Gemini, with GPT Image as alternative). No QA scoring — you review images yourself.

---

## Key Files

| File | Purpose |
|---|---|
| `skills/content-engine/SKILL.md` | The unified skill — lighting physics, lens selection, prompt rules, pipeline workflow |
| `projects/_shared/prompt-best-practices.md` | Companion — SEAL CAM/BOPA frameworks, provider-specific tuning, anti-patterns |
| `src/pipeline/index.ts` | Main pipeline orchestrator |
| `src/pipeline/director.ts` | Claude AI Director — prompt enrichment, cinematography planning |
| `src/pipeline/higgsfield.ts` | Higgsfield video generation with SOUL ID |
| `src/pipeline/brand-images.ts` | Multi-format image generation |
| `src/pipeline/storyboard.ts` | Gemini storyboard frame generation |
| `src/pipeline/gpt-image.ts` | GPT Image alternative provider |
| `src/pipeline/elevenlabs.ts` | Voiceover generation |
| `src/pipeline/whisper.ts` | Word-level caption transcription |
| `src/types/index.ts` | All TypeScript interfaces (VideoConfig, VideoClip, etc.) |
| `src/cli/run-pipeline.ts` | CLI entry point |
| `src/utils/cost-tracker.ts` | Cost estimation + logging |
| `src/utils/prompt-validator.ts` | Pre-API prompt validation |
| `src/utils/brand-memory.ts` | Per-brand learning from past runs |
| `src/utils/cache.ts` | Content-hash caching for API calls |
| `memory/brands/` | Per-brand context (accumulated across runs) |

---

## Providers

| Service | Role | Cost |
|---|---|---|
| **Gemini 3 Pro Image** | Brand images + storyboard frames (14 refs max) | ~$0.08/image |
| **GPT Image 1** | Alternative image provider (98% text accuracy) | ~$0.04/image |
| **Higgsfield** | Video generation — SOUL ID for character consistency | ~$0.80/5s, ~$1.60/10s |
| **Claude Sonnet** | Director AI — prompt enrichment, cinematography | ~$0.10 (cached) |
| **ElevenLabs** | Voiceover generation | ~$0.50 |
| **OpenAI Whisper** | Word-level caption transcription | ~$0.02 |
| **Remotion** | Programmatic video composition | Free (local) |

---

## Environment Variables

```env
GEMINI_API_KEY=          # Images (required)
ANTHROPIC_API_KEY=       # Director AI (required)
HF_API_KEY=              # Higgsfield video (required for video mode)
HF_API_SECRET=           # Higgsfield secret (required for video mode)
ELEVENLABS_API_KEY=      # Voiceover (video mode with script)
OPENAI_API_KEY=          # Whisper + GPT Image (optional)
```

---

## Modes

| Mode | Output | Cost |
|---|---|---|
| `brand-images` | Multi-format images (story 9:16, square 1:1, landscape 16:9) | ~$0.08/image |
| `video` | Full video with voiceover, captions, transitions | ~$0.80-1.60/clip + overhead |
| `full` | Brand images + video | Combined |

---

## CLI

```bash
npm start -- --project {name}                    # Full run
npm start -- --project {name} --dry-run          # Preview API calls + cost
npm start -- --project {name} --storyboard-only  # Frames only (video mode)
npm start -- --project {name} --json-output      # JSON summary
npm start -- --project {name} --variations 3     # Variations per scene
npm start -- --project {name} --regenerate 2,5   # Redo specific scenes
npm start -- --project {name} --draft            # Cheap video preview
npm start -- --project {name} --resume           # Continue from checkpoint
npm start -- --project {name} --director-only    # Director plan only
npm start -- --project {name} --list-voices      # ElevenLabs voices
```

---

## Cost Rules

1. Images are cheap (~$0.08) — generate and review
2. Video: always storyboard-only first, approve frames before video generation
3. Show estimated cost before any pipeline run
4. All steps are idempotent — re-running skips completed work
5. All API calls cached by content hash — changing unrelated config fields doesn't regenerate
6. Cost log saved to `projects/{name}/cache/cost-log.json`
7. Progressive order: cheapest first (Director → Storyboard → GATE → Video)

---

## Project Structure

```
projects/{name}/
├── config.json              ← required
├── product.jpg              ← references (optional, recommended)
├── model.jpg
├── style.jpg
├── music.mp3                ← background music (video mode)
├── brand/
│   ├── brand.json           ← colors { primary, secondary, accent }
│   └── logo.png
├── cache/                   ← auto-managed (director plan, cost log, hashes)
├── storyboard/              ← generated frames
└── output/
    ├── images/              ← brand images
    ├── clips/               ← video clips
    ├── audio/               ← voiceover
    └── final/               ← rendered video
```

---

## Prompt Quality Standards

The skill (`skills/content-engine/SKILL.md`) defines the full prompt writing system. Key principles:

- Every prompt is a photography brief — subject, lens, f-stop, light direction, surface materials
- Light physics matter: glass refracts (backlight), matte absorbs (side-light), metal reflects (large soft source)
- Same lighting setup across ALL scenes
- 200-600 chars per prompt
- Smart ref filtering — Director auto-tags scenes, pipeline sends only relevant refs per image
- No text/logos in Gemini prompts (GPT Image can handle text when needed)
- One frozen moment per prompt

See `projects/_shared/prompt-best-practices.md` for frameworks (SEAL CAM, BOPA), provider-specific tuning, and anti-patterns.

---

## Code Style

- TypeScript strict mode, ES modules (.js extensions in imports)
- Async/await, no callbacks
- All pipeline steps idempotent (skip if output exists)
- Cache expensive API calls by content hash
- Handle API failures gracefully: logger.warn() and continue
- Skills are pure SKILL.md files — no code, no dependencies

---

## Dependencies

```
@google/genai          — Gemini image generation
@higgsfield/client     — Higgsfield video generation
@anthropic-ai/sdk      — Claude Director
@remotion/bundler      — video composition
@remotion/renderer     — video rendering
elevenlabs             — voiceover
openai                 — Whisper + GPT Image
commander              — CLI
fs-extra               — file operations
```
