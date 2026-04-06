# Prompt Best Practices

Companion to the content-engine skill. The skill covers lighting physics, lens selection, and prompt structure. This doc covers frameworks, provider-specific tuning, and anti-patterns.

---

## Frameworks

### SEAL CAM (Product Hero / Cinematic)

Use for hero shots, dramatic product reveals, editorial moments.

- **S**etting — environment first ("dark weathered oak surface, warm out-of-focus background")
- **E**lements — subjects in frame ("frosted glass bottle, three raw shea nuts, dried lavender sprig")
- **A**tmosphere — light behavior on materials ("warm amber side-light raking across oak grain, glass bottle glowing from backlight")
- **L**ens — distance, angle, DOF ("85mm f/1.4, subject sharp, background dissolved to golden bokeh")
- **C**amera **M**ovement — video only, keep minimal ("slow push-in" or "static")

### BOPA (Lifestyle / Brand)

Use for lifestyle shots, model + product, in-use moments.

- **B**rand — palette, tone ("luxury minimal, warm earth tones, handmade not factory")
- **O**bject — product placement ("jar centered on lower third, label facing camera, lid resting beside it")
- **P**erson — model details if applicable ("woman mid-30s, natural makeup, dark skin, warm-toned wardrobe")
- **A**ction — the frozen moment ("fingertips pressing into cream surface, leaving an impression")

### UGC / Realism

Use when the brief calls for authentic, unpolished content that feels real.

- Realism keywords: "pores visible", "natural skin texture", "subtle imperfections", "unretouched", "no airbrushing"
- Avoid: "perfect", "flawless", "beautiful" — these trigger AI smoothing and plastic skin
- Lighting: "natural window light from camera-left", "phone camera flash", "ring light slightly above eye level"
- Environment: "kitchen counter with crumbs", "bathroom mirror with water spots", "messy bedroom vanity"
- The goal is scroll-stopping authenticity, not polished perfection

---

## Provider: Gemini (Image Generation)

Primary image provider. Best for reference-heavy product photography.

**Strengths:**
- Up to 14 reference images per generation — the biggest consistency lever
- Narrative descriptions outperform keyword lists
- Understands photography terminology natively ("editorial fashion", "product flat lay")
- Aspect ratio context helps composition ("vertical portrait composition", "wide landscape framing")

**Tips:**
- Quality modifiers help: "high-resolution", "4K detail", "HDR lighting"
- For text on product: enclose in quotes — `the label reads "Brand Name"` — works sometimes but don't rely on it. Use GPT Image if text accuracy is critical
- Start with fewer details, add per iteration. Single-element changes between iterations

**What to avoid:**
- Multi-product compositions without clear spatial direction ("jar centered lower third, nuts scattered camera-left" — tell Gemini where things go)

---

## Provider: GPT Image

Alternative image provider. Use when Gemini struggles or for text-heavy compositions.

**Strengths:**
- ~98% text accuracy (best in class) — logos, labels, packaging text
- Very literal interpretation — what you describe is what you get
- Does NOT auto-rewrite prompts (unlike DALL-E 3)

**Prompt order matters:**
1. Background/scene setup
2. Subject placement
3. Key visual details
4. Constraints and exclusions

**Tips:**
- More explicit than Gemini — describe every visual element you want
- Include intended use for polish level: "product advertisement", "social media content"
- Photography language works well: "35mm film grain", "50mm lens", "shallow depth of field"
- For realism: "candid", "unposed", "everyday detail", "weathered surfaces"
- Re-state invariants every iteration — drift is the default. Explicitly say "preserve identity", "maintain layout"

**When to choose GPT Image over Gemini:**
- Product has important text/typography that must be readable
- You need very literal prompt interpretation
- Gemini keeps inventing elements you didn't ask for

Set in config: `"imageProvider": "gpt-image"`

---

## Provider: Higgsfield (Video Generation)

Primary and only video provider. Routes through all available models (including Veo, Sora) on their platform.

**Key features:**
- SOUL ID locks character identity across all clips — prevents face drift
- Cinema Studio simulates real optical physics for consistent camera behavior
- Popcorn maintains style/lighting/color coherence across the full video

**Prompt approach:**
- Rich descriptions + cinematography context produce the best results
- Base prompts should include camera language, lighting direction, and material interaction (same rules as image prompts — the skill defines these)
- The Director AI enriches on top — adding continuity notes, SSML voice tags, and fine-tuning. It doesn't replace your base prompt, it builds on it

**For character consistency:**
- Add `soulId` to config — locks face/body across all clips
- Always include model-sheet.jpg and model-body.jpg refs in storyboard generation
- Re-state identity cues in each prompt if not using SOUL ID

---

## Anti-Patterns

The skill covers what good prompts look like. This table covers specific failure modes — things that actively make output worse:

| Pattern | Why it fails | Instead |
|---|---|---|
| Describing a sequence | "picks up, opens, pours" is 3 frames, AI picks one randomly | One frozen moment per prompt |
| Multi-subject without spatial direction | AI places things randomly, overlapping | Give positions: "jar centered lower third, nuts scattered camera-left" |
| Competing camera movements | "pan left while zooming in and tilting up" — physics conflict | ONE camera verb per prompt |
| Conflicting light sources | "golden hour" + "studio lighting" — impossible in reality | Pick one setup. Same setup every scene |
| "Perfect skin" / "flawless" | Triggers AI smoothing — skin looks plastic, waxy | "Natural skin texture, visible pores" for realism |
| Keyword spam | "luxury premium high-end elegant" — no visual information | Every word must describe something the camera can see |
| Expecting consistency without refs | Each generation is independent, AI has no memory | Reference images + smart ref filtering (automatic) + scene 1 anchoring |
