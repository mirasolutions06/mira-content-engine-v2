# Mira Content Engine

AI product photography and video from a single brief. One skill, one session.

---

## How It Works

Open Claude Code. Describe what you want. The engine handles everything through one unified skill (`content-engine`) in three phases:

```
Phase 1: Understand     →  Phase 2: Translate     →  Phase 3: Generate
"What are we shooting?"    Your vision → prompts      Run pipeline, review, iterate
```

You stay in control at every step — the engine pauses for your approval before spending money.

---

## Modes

| Mode | What you get | Cost per image |
|------|-------------|----------------|
| `brand-images` | Multi-format images (story 9:16, square 1:1, landscape 16:9) | ~$0.08 |
| `video` | AI video with voiceover, captions, transitions | ~$0.80-1.60/clip |
| `full` | Brand images + video in one run | Combined |

---

## Quick Start

### 1. Install

```bash
git clone <repo-url>
cd mira-content-engine
npm install
```

### 2. API Keys

Create `.env`:

```env
GEMINI_API_KEY=          # Images (storyboard + brand photos)
ANTHROPIC_API_KEY=       # Director AI (prompt enrichment)
HF_API_KEY=              # Higgsfield video generation
HF_API_SECRET=           # Higgsfield API secret
ELEVENLABS_API_KEY=      # Voiceover (video mode only)
OPENAI_API_KEY=          # Whisper captions + GPT Image (optional)
```

| Mode | Required |
|------|----------|
| `brand-images` | `GEMINI_API_KEY`, `ANTHROPIC_API_KEY` |
| `video` | + `HF_API_KEY`, `HF_API_SECRET` |
| `video` with voiceover | + `ELEVENLABS_API_KEY`, `OPENAI_API_KEY` |

### 3. Talk to Claude

> "Create content for Ama Shea — luxury African shea butter. Hero product is whipped body butter in a glass jar with wooden lid."

The engine asks about your visual world, builds the config, shows the cost, and waits for your go.

---

## Image-Only Example (brand-images)

The most common workflow. Generate product photography for social media.

### Step 1: Provide references

Drop these in `projects/your-project/`:

| File | What it tells the engine |
|------|--------------------------|
| `product.jpg` | Packaging material, color, shape, how light interacts with it |
| `product-1.jpg`, `product-2.jpg` | Multiple angles |
| `model.jpg` | Skin tone, features — informs lighting ratios |
| `model-sheet.jpg` | Multi-angle face reference (auto-generated if `modelSheet: true`) |
| `style.jpg` | THE creative direction — lighting, palette, surfaces, mood |
| `location.jpg` | Environment, textures, natural light |

More refs = better consistency. The engine uses up to 14 per image.

### Step 2: Config

```json
{
  "mode": "brand-images",
  "title": "ama-shea-gift-set",
  "brand": "Ama Shea",
  "brief": "Luxury African shea butter skincare. Warm golden amber lighting, dark wood surfaces, raw ingredients. Premium but grounded — handmade, not factory.",
  "products": [
    "whipped shea body butter in glass jar with wooden lid",
    "raw shea oil in glass dropper bottle with gold cap"
  ],
  "clips": [
    {
      "prompt": "Gift box partially open revealing skincare products on dark satin lining, warm golden key light from camera-left at 45 degrees, 50mm f/2.8, shallow depth of field on box edge, dark weathered wood surface",
      "imageFormat": "landscape",
      "refs": ["product-1.jpg", "product-2.jpg"]
    },
    {
      "prompt": "Hero close-up of whipped shea butter in glass jar with wooden lid, raw shea nuts scattered beside it, warm amber side light from camera-right, 85mm f/1.4 shallow focus, dark cracked wood surface",
      "imageFormat": "square",
      "refs": ["product-1.jpg"]
    },
    {
      "prompt": "Woman's hands lifting glass dropper bottle from open gift box, warm brown skin catching golden rim light, soft fill from left, 85mm f/2, intimate editorial moment",
      "imageFormat": "story",
      "refs": ["model-1.jpg", "model-sheet.jpg", "product-2.jpg"]
    }
  ]
}
```

**What makes these prompts work:**
- Specific materials: "glass jar with wooden lid" not "bottle"
- Light physics: "warm golden key light from camera-left at 45 degrees"
- Lens behavior: "85mm f/1.4 shallow focus"
- Same lighting across all scenes
- Smart ref filtering: Director auto-tags scenes, each gets only the refs it needs

### Step 3: Generate

```bash
npm start -- --project ama-shea-gift-set
```

Images generate immediately (~$0.08 each). Scene 1 becomes the style anchor — all subsequent images match its lighting, color temperature, and mood automatically.

### What you get

```
output/images/
├── 1-landscape.jpg    ← gift box shot
├── 2-square.jpg       ← butter jar hero
└── 3-story.jpg        ← hands + dropper
```

3 clips x 1 format each = 3 images. Or set `"imageFormats": ["story", "square", "landscape"]` for all three formats per clip.

### Iterate

```
"scene 2 is too dark"           → updates prompt, regenerates just that scene
"give me 3 options for scene 1" → npm start -- --project X --variations 3
"redo scenes 2 and 3"           → npm start -- --project X --regenerate 2,3
"start completely fresh"        → delete cache/ and output/, re-run
```

---

## Video Example

### Config

```json
{
  "mode": "video",
  "format": "youtube-short",
  "title": "summer-campaign",
  "client": "Nike",
  "script": "This summer, move like never before. The new Air Max — built for the streets.",
  "voiceId": "pNInz6obpgDQGcFmaJgB",
  "videoProvider": "higgsfield",
  "clips": [
    {
      "prompt": "Runner sprints through neon-lit city street at dusk, wet asphalt reflecting orange streetlights, 35mm anamorphic lens with natural flare, tracking shot",
      "duration": 5
    },
    {
      "prompt": "Extreme low-angle close-up of Nike Alphafly shoes mid-stride through puddle, water frozen in mid-splash, 85mm macro, shallow depth of field",
      "duration": 5
    },
    {
      "prompt": "Runner stops and looks at camera, confident, city lights dissolved to warm bokeh circles, golden hour rim light catching jaw and shoulder, 85mm f/1.4",
      "duration": 5
    }
  ],
  "transition": "cut",
  "captions": true,
  "captionTheme": "bold",
  "hookText": "MOVE DIFFERENT",
  "cta": { "text": "Shop Air Max", "subtext": "nike.com" },
  "music": true,
  "musicVolume": 0.12
}
```

### Pipeline

```
1. Director AI (Claude)        Enriches prompts, plans cinematography     ~$0.10
2. Voiceover (ElevenLabs)      Generates speech from script               ~$0.50
3. Captions (Whisper)          Word-level transcription                   ~$0.02
4. Storyboard (Gemini)         Static frames for each scene               ~$0.08/frame
   ── YOU REVIEW FRAMES ──
5. Video (Higgsfield)          Animates frames into clips                 ~$0.80/clip
6. Render (Remotion)           Composites into final MP4                  free
```

### Two-phase workflow

Run storyboard first (cheap):
```bash
npm start -- --project summer-campaign --storyboard-only
```

Review the frames. If they look good, run the full pipeline:
```bash
npm start -- --project summer-campaign --json-output
```

Higgsfield only runs on approved frames. Everything else is cached.

### Character consistency (SOUL ID)

For video with people, add a `soulId` to lock character identity across all clips:

```json
{
  "videoProvider": "higgsfield",
  "soulId": "your-soul-id-here"
}
```

This prevents face drift between clips — the same person looks the same in every scene.

---

## Reference Photos

The single biggest quality lever. These go in the project root:

| File pattern | What it's for |
|-------------|---------------|
| `product.jpg`, `product-1.jpg` | Product packaging — material, color, shape, label |
| `model.jpg`, `model-1.jpg` | Person to feature — face, skin tone, features |
| `model-sheet.jpg` | Multi-angle face sheet (auto-generated with `modelSheet: true`) |
| `model-body.jpg` | Full-body reference (auto-generated with `modelSheet: true`) |
| `style.jpg` | Visual mood — lighting setup, palette, surfaces |
| `location.jpg` | Environment, textures, spatial context |

**Refs are filtered automatically.** The Director reads each prompt and sends only the refs that scene needs:

| Scene type | Refs sent to Gemini |
|---|---|
| Product only | product refs + style |
| Model + product | all model refs + product + style |
| Detail/hands | model refs (skin tone) + product |
| Environment | style/location only |

No manual `refs` field needed in config. You can override with `"refs": ["product-1.jpg"]` on any clip if needed.

---

## Prompt Writing Guide

Every prompt describes a real photograph. Not a mood, not a vibe — a camera direction.

### Structure

```
[shot distance] of [subject with materials] on [surface],
[light source + direction + quality], [lens + f-stop],
[depth of field], [color temperature]
```

### Light + Material Cheat Sheet

| Material | Best light | Why |
|----------|-----------|-----|
| Glass/liquid | Backlight or side-light | Makes it glow, shows transparency |
| Matte surface | Side-light at 90° | Reveals texture |
| Metal/chrome | Large soft source | Clean reflections |
| Dark skin | Key 30-45° off-axis, strong fill (1.5:1) | Rim light separates from background |
| Light skin | Harder ratios OK (3:1+) | Dramatic shadow works |
| Fabric | Side-light | Reveals weave and texture |

### Lens Cheat Sheet

| Lens | Effect | Use for |
|------|--------|---------|
| 24-35mm | Wide, environmental | Location shots, flat lays |
| 50mm | Natural perspective | Product on surface |
| 85mm f/1.4 | Compression, shallow DOF | Portraits, hero products |
| 100mm macro | Extreme detail | Texture, ingredients |

### Rules

1. 200-600 chars per prompt
2. No text/logos — AI can't render them
3. Specific materials — "amber glass jar with bamboo lid" not "bottle"
4. Camera language in every prompt
5. Lighting direction in every prompt
6. Same lighting across all scenes
7. Same background across all scenes
8. One frozen moment per prompt

---

## Project Structure

```
projects/your-project/
├── config.json              ← required
├── product.jpg              ← references (optional, recommended)
├── model.jpg
├── style.jpg
├── music.mp3                ← background music (video mode)
├── brand/
│   ├── brand.json           ← colors { primary, secondary, accent }
│   ├── logo.png
│   └── font-bold.ttf
├── cache/                   ← auto-managed
├── output/
│   ├── images/              ← brand images
│   ├── clips/               ← video clips
│   ├── audio/               ← voiceover
│   └── final/               ← rendered video
└── storyboard/              ← generated frames
```

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

## Costs

| Step | Provider | Cost |
|------|----------|------|
| Director | Claude Sonnet | ~$0.10 (cached) |
| Brand image | Gemini | ~$0.08 |
| Brand image | GPT Image | ~$0.04 |
| Video clip 5s | Higgsfield | ~$0.80 |
| Video clip 10s | Higgsfield | ~$1.60 |
| Voiceover | ElevenLabs | ~$0.50 |
| Captions | Whisper | ~$0.02 |
| Model sheet | Gemini x2 | ~$0.16 |
| Render | Remotion | Free |

**Typical costs:**
- 5-image brand shoot: ~$0.50
- 8-image multi-format campaign: ~$1.92
- 3-clip video short: ~$3.50
- Full campaign (images + video): ~$5-8

All steps are idempotent. Re-running skips completed work. Delete a file to regenerate just that step.

---

## AI Stack

| Service | Role |
|---------|------|
| **Claude Sonnet** | Director AI — enriches prompts with cinematography |
| **Gemini 3 Pro Image** | Brand images + storyboard frames (14 refs max) |
| **GPT Image 1** | Alternative image provider (better text rendering) |
| **Higgsfield** | Video generation with SOUL ID character consistency |
| **ElevenLabs** | Voiceover generation |
| **OpenAI Whisper** | Word-level caption transcription |
| **Remotion** | Programmatic video composition |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `GEMINI_API_KEY not set` | Add to `.env` — [aistudio.google.com](https://aistudio.google.com) |
| `HF_API_KEY not set` | Add to `.env` — [cloud.higgsfield.ai](https://cloud.higgsfield.ai) |
| Gemini returns no image | Check API key. Frame generation is non-fatal — continues without it |
| FFmpeg not found | `brew install ffmpeg` |
| Remotion error on short clips | Raw clip at `output/clips/scene-N.mp4` is the deliverable |
| Re-run regenerates everything | It shouldn't — steps are idempotent. Delete specific files to force regeneration |
| Images look inconsistent | Add more reference photos. Smart refs handles filtering automatically. Check same lighting in every prompt |
| Wrong person in model shots | Add `modelSheet: true` and include all 3 model refs per clip |
