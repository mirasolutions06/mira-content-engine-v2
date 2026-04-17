# Mira Content Engine

AI product photography and video from a single brief. One skill, one session. Billboard-ready brand images and video — powered by Gemini, Kling, Seedance, and Claude.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/Node-18%2B-green)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## Table of Contents

- [How It Works](#how-it-works)
- [Features](#features)
- [Quick Start](#quick-start)
- [Modes](#modes)
- [Video Providers](#video-providers)
- [Brand Images Example](#brand-images-example)
- [Video Example](#video-example)
- [Reference Photos](#reference-photos)
- [Prompt Writing Guide](#prompt-writing-guide)
- [Project Structure](#project-structure)
- [CLI Reference](#cli-reference)
- [Cost Reference](#cost-reference)
- [AI Stack](#ai-stack)
- [Troubleshooting](#troubleshooting)
- [License](#license)

---

## How It Works

Open Claude Code. Describe what you want. The engine handles everything through one unified skill (`content-engine`) in three phases:

```
Phase 1: Understand     →  Phase 2: Translate     →  Phase 3: Generate
"What are we shooting?"    Your vision → config       Run pipeline, review, iterate
```

You stay in control at every step — the engine pauses for your approval before spending money.

---

## Features

- **Three video providers** — Higgsfield DoP, Seedance 1.0 Pro, and Kling 2.1 via a single API
- **Keyframe interpolation** — Give Kling a start and end frame, it animates the in-between
- **Smart ref filtering** — Director AI auto-tags each scene; only relevant references get sent to the image model
- **Idempotent pipeline** — Re-running skips completed work. Delete a file to regenerate just that step
- **Content-hash caching** — API calls cached by content hash. Changing unrelated config fields doesn't re-bill
- **Multi-format output** — Story (9:16), square (1:1), landscape (16:9) from the same prompt set
- **Scene anchoring** — Scene 1 becomes the style anchor; all subsequent images auto-match its lighting and mood
- **Brand memory** — Per-brand context accumulates across runs in `memory/brands/`
- **Cost transparency** — Estimated cost shown before every pipeline run, logged per project
- **Raw clip mode** — `render: false` skips Remotion and delivers the raw provider clip at full quality

---

## Quick Start

### 1. Clone and install

```bash
git clone https://github.com/mirasolutions06/mira-content-engine-v2.git
cd mira-content-engine-v2
npm install
```

### 2. API keys

Create `.env` in the project root:

```env
GEMINI_API_KEY=          # Images — storyboard + brand photos (required)
ANTHROPIC_API_KEY=       # Director AI — prompt enrichment (required)
HF_API_KEY=              # Higgsfield — all 3 video providers (video mode)
HF_API_SECRET=           # Higgsfield secret (video mode)
ELEVENLABS_API_KEY=      # Voiceover (video mode with script)
OPENAI_API_KEY=          # Whisper captions + GPT Image (optional)
```

| Mode | Required keys |
|------|---------------|
| `brand-images` | `GEMINI_API_KEY`, `ANTHROPIC_API_KEY` |
| `video` | + `HF_API_KEY`, `HF_API_SECRET` |
| `video` + voiceover | + `ELEVENLABS_API_KEY`, `OPENAI_API_KEY` |

### 3. Run

> "Create content for Ama Shea — luxury African shea butter. Hero product is whipped body butter in a glass jar with wooden lid."

The engine asks about your visual world, builds the config, shows the cost, and waits for your go.

---

## Modes

| Mode | Output | Cost |
|------|--------|------|
| `brand-images` | Multi-format images (story 9:16, square 1:1, landscape 16:9) | ~$0.08/image |
| `video` | AI video with optional voiceover, captions, transitions | ~$0.80–3.00/clip |
| `full` | Brand images + video in one run | Combined |

---

## Video Providers

Three image-to-video models, all via Higgsfield's REST API. One set of credentials covers all three.

| Provider | Model | Best for | Cost (10s) | Speed |
|----------|-------|----------|------------|-------|
| `higgsfield` | DoP Turbo | Motion presets (Catwalk, 3D Rotation, Static, Handheld), SOUL ID character consistency | ~$1.60 | ~1 min |
| `seedance` | Seedance 1.0 Pro | Smooth subtle motion, `camera_fixed` flag, natural standing shots | ~$1.60 | ~2 min |
| `kling` | Kling 2.1 Master | Premium prompt-driven motion, native negative prompts, keyframe interpolation | ~$3.00 | ~7 min |

Set per project: `"videoProvider": "higgsfield" | "seedance" | "kling"` in config.json.

### Keyframe interpolation (Kling)

Supply a start and end frame — Kling animates the transition between them:

```json
{
  "videoProvider": "kling",
  "clips": [{
    "prompt": "Woman smoothly turns from facing camera to three-quarter rear view",
    "duration": 10,
    "imageReference": "storyboard/scene-1.jpg",
    "imageReferenceEnd": "storyboard/scene-1-end.jpg"
  }]
}
```

Auto-switches to `kling-v2-1` (standard) for keyframe runs — the master variant silently rejects `input_image_end`.

### Raw clip mode

Skip voiceover, captions, and Remotion — deliver the raw provider clip at full quality:

```json
{
  "render": false
}
```

The pipeline copies the raw mp4 from `output/clips/` into `output/final/` and exits.

---

## Brand Images Example

### Step 1: References

Drop reference images in `projects/your-project/`:

| File | What it tells the engine |
|------|--------------------------|
| `product.jpg` | Packaging material, color, shape, how light hits it |
| `model.jpg` | Face, skin tone, features — informs lighting ratios |
| `style.jpg` | Creative direction — lighting, palette, surfaces, mood |
| `location.jpg` | Environment, textures, natural light |

### Step 2: Config

```json
{
  "mode": "brand-images",
  "title": "ama-shea-gift-set",
  "brand": "Ama Shea",
  "brief": "Luxury African shea butter skincare. Warm golden amber lighting, dark wood surfaces, raw ingredients.",
  "clips": [
    {
      "prompt": "Gift box open on dark wood surface, warm golden key light 45 degrees camera-left, 50mm f/2.8, shallow DOF on box edge",
      "imageFormat": "landscape",
      "refs": ["product-1.jpg", "product-2.jpg"]
    },
    {
      "prompt": "Hero close-up of whipped shea butter in glass jar, raw shea nuts beside it, warm amber side light, 85mm f/1.4",
      "imageFormat": "square"
    }
  ]
}
```

### Step 3: Generate

```bash
npm start -- --project ama-shea-gift-set
```

Scene 1 becomes the style anchor — all subsequent images auto-match its look.

### Iterate

```bash
npm start -- --project X --variations 3        # 3 options for each scene
npm start -- --project X --regenerate 2,5      # Redo specific scenes
```

---

## Video Example

### Config

```json
{
  "mode": "video",
  "format": "youtube-short",
  "title": "summer-campaign",
  "script": "This summer, move like never before.",
  "voiceId": "pNInz6obpgDQGcFmaJgB",
  "videoProvider": "seedance",
  "clips": [
    {
      "prompt": "Runner sprints through neon-lit city street at dusk, wet asphalt reflecting orange streetlights, 35mm anamorphic",
      "duration": 5
    },
    {
      "prompt": "Low-angle close-up of shoes mid-stride through puddle, water frozen mid-splash, 85mm macro",
      "duration": 5
    }
  ],
  "captions": true,
  "music": true
}
```

### Pipeline flow

```
1. Director AI (Claude)        Enriches prompts, plans cinematography     ~$0.10
2. Voiceover (ElevenLabs)      Generates speech from script               ~$0.50
3. Captions (Whisper)          Word-level transcription                   ~$0.02
4. Storyboard (Gemini)         Static frames for each scene               ~$0.08/frame
   ── YOU REVIEW FRAMES ──
5. Video generation            Animates frames into clips                 ~$0.80–3.00/clip
6. Render (Remotion)           Composites into final MP4                  free
```

### Two-phase workflow

Generate frames first (cheap), then video (expensive):

```bash
npm start -- --project summer-campaign --storyboard-only   # Review frames
npm start -- --project summer-campaign                      # Full pipeline
```

---

## Reference Photos

The single biggest quality lever. Smart ref filtering sends each scene only the refs it needs:

| Scene type | Refs sent |
|---|---|
| Product only | product refs + style |
| Model + product | all model refs + product + style |
| Detail/hands | model refs (skin tone) + product |
| Environment | style/location only |

Override per clip with `"refs": ["product-1.jpg"]` if needed.

---

## Prompt Writing Guide

Every prompt describes a real photograph — a camera direction, not a mood.

### Structure

```
[shot distance] of [subject with materials] on [surface],
[light source + direction + quality], [lens + f-stop],
[depth of field], [color temperature]
```

### Light + Material

| Material | Best light | Why |
|----------|-----------|-----|
| Glass/liquid | Backlight or side-light | Shows transparency |
| Matte surface | Side-light at 90 degrees | Reveals texture |
| Metal/chrome | Large soft source | Clean reflections |
| Dark skin | Key 30-45 degrees off-axis, strong fill (1.5:1) | Rim light separates from background |
| Fabric | Side-light | Reveals weave and texture |

### Lens

| Lens | Use for |
|------|---------|
| 24-35mm | Location shots, flat lays |
| 50mm | Product on surface |
| 85mm f/1.4 | Portraits, hero products |
| 100mm macro | Texture, ingredients |

### Rules

1. 200–600 chars per prompt
2. No text or logos (AI can't render them reliably — use GPT Image if text is needed)
3. Specific materials — "amber glass jar with bamboo lid" not "bottle"
4. Camera language in every prompt
5. Lighting direction in every prompt
6. Same lighting across all scenes
7. One frozen moment per prompt

---

## Project Structure

```
projects/your-project/
├── config.json              <- required
├── product.jpg              <- references (optional, recommended)
├── model.jpg
├── style.jpg
├── music.mp3                <- background music (video mode)
├── brand/
│   ├── brand.json           <- colors { primary, secondary, accent }
│   └── logo.png
├── cache/                   <- auto-managed
├── storyboard/              <- generated frames
└── output/
    ├── images/              <- brand images
    ├── clips/               <- video clips
    ├── audio/               <- voiceover
    └── final/               <- rendered video
```

---

## CLI Reference

```bash
npm start -- --project {name}                    # Full run
npm start -- --project {name} --dry-run          # Preview API calls + cost
npm start -- --project {name} --storyboard-only  # Frames only
npm start -- --project {name} --json-output      # JSON summary
npm start -- --project {name} --variations 3     # N variations per scene
npm start -- --project {name} --regenerate 2,5   # Redo specific scenes
npm start -- --project {name} --draft            # Cheap video preview
npm start -- --project {name} --resume           # Continue from checkpoint
npm start -- --project {name} --director-only    # Director plan only
npm start -- --project {name} --list-voices      # ElevenLabs voices
```

---

## Cost Reference

| Step | Provider | Cost |
|------|----------|------|
| Director | Claude Sonnet | ~$0.10 |
| Brand image | Gemini 3 Pro | ~$0.08 |
| Brand image | GPT Image | ~$0.04 |
| Video clip 5s | Higgsfield DoP | ~$0.80 |
| Video clip 10s | Higgsfield DoP | ~$1.60 |
| Video clip 5s | Seedance Pro | ~$0.80 |
| Video clip 10s | Seedance Pro | ~$1.60 |
| Video clip 5s | Kling 2.1 | ~$1.50 |
| Video clip 10s | Kling 2.1 | ~$3.00 |
| Voiceover | ElevenLabs | ~$0.50 |
| Captions | Whisper | ~$0.02 |
| Render | Remotion | Free |

**Typical costs:**

| Project type | Cost |
|---|---|
| 5-image brand shoot | ~$0.50 |
| 8-image multi-format campaign | ~$1.92 |
| 3-clip video short (Seedance) | ~$5.50 |
| Full campaign (images + video) | ~$5–8 |

All steps are idempotent. Re-running skips completed work. Delete a file to regenerate just that step.

---

## AI Stack

| Service | Role |
|---------|------|
| **Claude Sonnet** | Director AI — prompt enrichment, cinematography planning |
| **Gemini 3 Pro Image** | Brand images + storyboard frames (14 refs max) |
| **GPT Image 1** | Alternative image provider (better text rendering) |
| **Higgsfield DoP** | Video — motion preset catalog, explicit camera moves |
| **Seedance 1.0 Pro** | Video — natural subtle motion, `camera_fixed` flag |
| **Kling 2.1** | Video — premium motion control, keyframe interpolation |
| **ElevenLabs** | Voiceover generation |
| **OpenAI Whisper** | Word-level caption transcription |
| **Remotion** | Programmatic video composition |

All three video providers reach the user via Higgsfield's REST API at `platform.higgsfield.ai`. One set of credentials gives access to all three.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `GEMINI_API_KEY not set` | Add to `.env` — [aistudio.google.com](https://aistudio.google.com) |
| `HF_API_KEY not set` | Add to `.env` — [cloud.higgsfield.ai](https://cloud.higgsfield.ai) |
| Gemini returns no image | Check API key. Frame generation is non-fatal — continues without it |
| FFmpeg not found | `brew install ffmpeg` |
| Re-run regenerates everything | It shouldn't — steps are idempotent. Delete specific files to force regeneration |
| Images look inconsistent | Add more reference photos. Check that lighting language is consistent across all prompts |
| Wrong person in model shots | Add `modelSheet: true` and include all model refs per clip |
| Video clip too short/long | Kling only supports 5 or 10 seconds. Seedance supports 3–12. Higgsfield supports 5 or 10 |
| Kling keyframe fails silently | Only `kling-v2-1` (standard) supports keyframe interpolation, not master. The pipeline auto-switches |
| Subject starts dancing | Add negative prompt language. Seedance uses `camera_fixed: true` by default |

---

## License

MIT


