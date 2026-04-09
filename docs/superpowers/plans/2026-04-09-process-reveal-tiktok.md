# TikTok Process-Reveal Video Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `process-video` mode to the Mira Content Engine that renders vertical 1080x1920 TikTok-style process-reveal videos (22s, 5 beats: hook → raw photo → workflow → final reveal → CTA) from a JSON config pointing at existing project assets.

**Architecture:** A new Remotion composition `ProcessReveal` is registered in `src/remotion/Root.tsx`. A new sibling CLI entry `src/cli/process-video.ts` (exposed via `npm run process-video`) loads a per-video JSON config from `projects/{name}/process-videos/{video-id}.json`, validates it, and invokes the Remotion renderer. Six small visual primitive components are ported in from the `remocn` registry (MIT-licensed) into `src/remotion/components/process/`, then composed into five beat components. A single `T` (timing anchor) object in `src/remotion/helpers/process-timing.ts` lets you retime the whole video in one place. No AI provider calls — this is pure composition of existing project files.

**Tech Stack:** TypeScript 5 strict mode (`noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`), ES modules (import paths end in `.js`), React 18, Remotion 4, commander for CLI, fs-extra for file ops. No new dependencies.

**Source of primitives:** [remocn registry](https://github.com/kapishdima/remocn) — MIT-compatible. We port files directly (no `npx shadcn add`, no extra deps).

**Remotion file-serving contract (critical — read before any task):**

Remotion's renderer only serves files via its local HTTP server — it does NOT accept absolute filesystem paths in `<Img src>`, `<Audio src>`, etc. The existing pipeline (see `src/pipeline/index.ts:833-890`) handles this by:
1. Setting `publicDir` on `bundle()` to `projects/{projectName}` — this makes the project folder the root that `staticFile()` serves from.
2. Passing a webpack `extensionAlias` override so `.js` imports resolve to `.tsx` files during bundling.
3. Converting absolute asset paths to `publicDir`-relative strings before passing them as `inputProps`.
4. Calling `staticFile()` (via `src/remotion/helpers/resolve-src.ts`) inside components to turn relative strings into served URLs.

**This plan mirrors that pattern exactly.** Every asset path in `ProcessVideoProps.publicAssets` is a `publicDir`-relative string (e.g. `process-videos/assets/phone.jpg`, not `/Users/.../phone.jpg`). Beat components call `resolveSrc()` before passing to `<Img>`.

**TypeScript strict gotchas to watch for while implementing:**
- `noUncheckedIndexedAccess: true`: `array[i]` is `T | undefined`. Ported primitives that do `grid[y][x]` or `colors[i]` must either (a) store values via a local non-`undefined`-returning access pattern, (b) use non-null assertion `!` with justification, or (c) narrow explicitly. Every "verify it compiles" step will catch this if you miss it — fix in the same commit.
- `exactOptionalPropertyTypes: true`: don't pass `dryRun: undefined` into an optional field; conditionally spread it in instead.
- `.js` import extensions are mandatory (even though source files are `.tsx`/`.ts`) — the `extensionAlias` webpack override in `bundle()` rewrites them at bundle time.

---

## File Structure

### New files
- `src/cli/process-video.ts` — CLI entry, parses `--project`, `--video`, `--studio`, `--dry-run`
- `src/pipeline/process-video.ts` — loads config, validates asset paths, calls Remotion renderer
- `src/types/process-video.ts` — `ProcessVideoConfig`, `ProcessVideoProps`, `BeatKey` types
- `src/remotion/helpers/process-timing.ts` — single `T` anchor object + helpers (`beatRange`, `localFrame`)
- `src/remotion/components/process/BlurReveal.tsx` — text blur-to-sharp (ported)
- `src/remotion/components/process/GridPixelateWipe.tsx` — pixelated cell reveal (ported)
- `src/remotion/components/process/ImageExpandToFullscreen.tsx` — shared-element morph (ported, simplified)
- `src/remotion/components/process/StaggeredFadeUp.tsx` — grid items fade up in sequence (ported)
- `src/remotion/components/process/ShimmerSweep.tsx` — diagonal shine sweep over an image (ported)
- `src/remotion/components/process/SuccessConfetti.tsx` — final burst particles (ported)
- `src/remotion/components/process/BeatHook.tsx` — Beat 1 (3s): pixelated hero + `hook_text`
- `src/remotion/components/process/BeatContext.tsx` — Beat 2 (4s): raw phone photo + `context_text`
- `src/remotion/components/process/BeatProcess.tsx` — Beat 3 (6s): workflow grid + `process_text`
- `src/remotion/components/process/BeatReveal.tsx` — Beat 4 (6s): final shot morph to fullscreen + shimmer + `reveal_text`
- `src/remotion/components/process/BeatCTA.tsx` — Beat 5 (3s): handle + `cta_text` + confetti
- `src/remotion/compositions/ProcessReveal.tsx` — top-level composition that sequences the 5 beats
- `projects/_templates/process-video.json` — documented example config
- `scripts/verify-process-config.mjs` — tiny verification script (loads a config, prints validation result)

### Modified files
- `src/remotion/Root.tsx` — register `ProcessReveal` composition (1080x1920, 30 fps, 660 frames)
- `src/types/index.ts` — re-export `ProcessVideoConfig` from `./process-video.js`
- `package.json` — add `"process-video": "tsx src/cli/process-video.ts"` script

### Config shape (what `projects/{name}/process-videos/hoodie-reveal.json` looks like)
```json
{
  "video_id": "hoodie-reveal",
  "product_name": "Tyre Black Hoodie",
  "assets": {
    "raw_photo": "process-videos/assets/hoodie-phone.jpg",
    "workflow_image": "process-videos/assets/hoodie-workflow.jpg",
    "final_shot": "output/images/hoodie-hero.jpg"
  },
  "beats": {
    "hook_text": "AI trick",
    "context_text": "This is all I shot",
    "process_text": "One prompt later...",
    "reveal_text": "Studio quality",
    "cta_text": "DM for yours"
  },
  "handle": "@mirastudio",
  "accent_color": "#A1EEBD",
  "speed": 1.0
}
```
All asset paths are resolved relative to `projects/{project}/`.

### Output location
`projects/{project}/output/process-videos/{video_id}.mp4` (vertical 1080x1920, H.264, ~22s @ 30fps)

### publicDir strategy
At render time, `publicDir` is set to `projects/{projectName}`. All three asset fields in the config are project-relative strings (e.g. `output/images/hoodie.jpg`), which are already publicDir-relative by construction. The pipeline validates each file exists (resolving to an absolute path for the existence check), then passes the **original relative strings** through to Remotion as `publicAssets`. Beat components call `resolveSrc(publicAssets.xxx)` which wraps `staticFile()`.

---

## Testing Approach

The engine has **no test framework** (confirmed via `package.json` grep — no vitest/jest). We do **not** introduce one for this feature (YAGNI).

Instead, every task has a **verify** step that is one of:
1. **Config loader / timing helper** — run a tiny node script that exercises the pure function and `console.log`s the result; assert shape matches expectation manually.
2. **Visual components (beats, primitives)** — open Remotion Studio (`npm run remotion`) and scrub the timeline. Each beat has a verify step that says exactly what to look for.
3. **Full pipeline** — render a test MP4 and play it; inspect duration, resolution, and that each beat fires at its anchor.

Frequent commits after each task. No test framework deps added.

**Prerequisite for all verify steps:** Have a `projects/_test-process` project with three placeholder images already present:
- `projects/_test-process/process-videos/assets/phone.jpg` (1024x1536 — any photo-style image)
- `projects/_test-process/process-videos/assets/workflow.jpg` (1200x1200 — any grid/screenshot-looking image)
- `projects/_test-process/output/images/final.jpg` (1024x1536 — any clean product image)

And a config at `projects/_test-process/process-videos/test.json` using the shape above.

**Create this test fixture as Task 0 before anything else.**

---

## Task 0: Set up test fixture project

**Files:**
- Create: `projects/_test-process/process-videos/test.json`
- Create: `projects/_test-process/process-videos/assets/phone.jpg` (copy any JPG already in the repo)
- Create: `projects/_test-process/process-videos/assets/workflow.jpg`
- Create: `projects/_test-process/output/images/final.jpg`

- [ ] **Step 1: Find three placeholder images (with fallback)**

Run:
```bash
find projects -type f \( -name "*.jpg" -o -name "*.jpeg" -o -name "*.png" \) -not -path "*/cache/*" -not -path "*/node_modules/*" 2>/dev/null | head -20
```
If this lists at least 3 files, pick any three and go to Step 2.

**If fewer than 3 files** (fresh repo / everything in cache), generate three solid-color JPGs with ImageMagick or sips:

Using ImageMagick (if installed — `which magick`):
```bash
mkdir -p /tmp/process-placeholders
magick -size 1080x1920 xc:'#3b4252' /tmp/process-placeholders/phone.jpg
magick -size 1080x1080 xc:'#5e81ac' /tmp/process-placeholders/workflow.jpg
magick -size 1080x1920 xc:'#a3be8c' /tmp/process-placeholders/final.jpg
```

Using macOS `sips` (always available on macOS — no install needed):
```bash
mkdir -p /tmp/process-placeholders
# sips can't create from nothing, so export PNGs from a built-in icon then convert
for pair in "phone 3b4252" "workflow 5e81ac" "final a3be8c"; do
  name=$(echo "$pair" | awk '{print $1}')
  python3 -c "
from PIL import Image
img = Image.new('RGB', (1080, 1920), (59, 66, 82))
img.save('/tmp/process-placeholders/${name}.jpg', 'JPEG')
"
done
```

If neither works, **just copy any single image in the repo three times** — content doesn't matter for this fixture, only that three distinct files exist at the expected paths. Note it in the commit message so the next developer understands.

- [ ] **Step 2: Create directories and copy placeholders**

Run:
```bash
mkdir -p projects/_test-process/process-videos/assets projects/_test-process/output/images
cp <path-to-first-image>  projects/_test-process/process-videos/assets/phone.jpg
cp <path-to-second-image> projects/_test-process/process-videos/assets/workflow.jpg
cp <path-to-third-image>  projects/_test-process/output/images/final.jpg
ls -la projects/_test-process/process-videos/assets/ projects/_test-process/output/images/
```
Expected: three files present, each non-zero bytes.

- [ ] **Step 3: Write the test config**

Create `projects/_test-process/process-videos/test.json`:
```json
{
  "video_id": "test",
  "product_name": "Test Product",
  "assets": {
    "raw_photo": "process-videos/assets/phone.jpg",
    "workflow_image": "process-videos/assets/workflow.jpg",
    "final_shot": "output/images/final.jpg"
  },
  "beats": {
    "hook_text": "AI trick",
    "context_text": "This is all I shot",
    "process_text": "One prompt later...",
    "reveal_text": "Studio quality",
    "cta_text": "DM for yours"
  },
  "handle": "@mirastudio",
  "accent_color": "#A1EEBD",
  "speed": 1.0
}
```

- [ ] **Step 4: Commit**

```bash
git add projects/_test-process
git commit -m "test: add process-reveal test fixture"
```

---

## Task 1: Types — define `ProcessVideoConfig` and `ProcessVideoProps`

**Files:**
- Create: `src/types/process-video.ts`
- Modify: `src/types/index.ts` (add one re-export line)

- [ ] **Step 1: Write the types file**

Create `src/types/process-video.ts`:
```ts
// Per-beat text strings. All required.
export interface ProcessVideoBeats {
  hook_text: string;
  context_text: string;
  process_text: string;
  reveal_text: string;
  cta_text: string;
}

// Asset paths — all project-relative (relative to projects/{projectName}/).
// The pipeline uses publicDir = projects/{projectName}, so these strings
// are ALREADY publicDir-relative and suitable for staticFile() after validation.
export interface ProcessVideoAssets {
  raw_photo: string;
  workflow_image: string;
  final_shot: string;
}

// JSON shape loaded from projects/{name}/process-videos/{id}.json
export interface ProcessVideoConfig {
  video_id: string;
  product_name: string;
  assets: ProcessVideoAssets;
  beats: ProcessVideoBeats;
  handle: string;
  /** Hex color for accent (confetti, shimmer, CTA glow). Default: '#A1EEBD' */
  accent_color?: string;
  /** Global playback speed multiplier. Default: 1.0 */
  speed?: number;
}

// Props passed to the Remotion <ProcessReveal> composition.
// publicAssets are publicDir-relative strings (same shape as config.assets,
// but guaranteed to point at real files and pre-normalized with forward slashes).
// Beat components call resolveSrc()/staticFile() on these before passing to <Img>.
export interface ProcessVideoProps {
  config: ProcessVideoConfig;
  publicAssets: ProcessVideoAssets;
}

export type BeatKey = 'hook' | 'context' | 'process' | 'reveal' | 'cta';
```

- [ ] **Step 2: Re-export from the main types barrel**

In `src/types/index.ts`, add at the bottom:
```ts
// Process-reveal video types (TikTok mode)
export type {
  ProcessVideoConfig,
  ProcessVideoAssets,
  ProcessVideoBeats,
  ProcessVideoProps,
  BeatKey,
} from './process-video.js';
```

- [ ] **Step 3: Verify types compile**

Run:
```bash
npm run build
```
Expected: Exits 0 with no output (tsc --noEmit passes).

- [ ] **Step 4: Commit**

```bash
git add src/types/process-video.ts src/types/index.ts
git commit -m "feat(types): add ProcessVideoConfig for process-reveal mode"
```

---

## Task 2: Timing helper — single `T` anchor object

**Files:**
- Create: `src/remotion/helpers/process-timing.ts`
- Create: `scripts/verify-process-timing.mjs` (temporary verification script, deleted after task)

**Context:** Mirrors the `T` object pattern from `remocn/product-launch-trailer` — all beat timings live in ONE place so you can retime the whole video by editing a single object.

- [ ] **Step 1: Write the timing helper**

Create `src/remotion/helpers/process-timing.ts`:
```ts
// Single source of truth for beat timings.
// Change values here to retime the entire process-reveal composition.
// All values are in FRAMES at 30fps.
//
// Beat layout (22s total = 660 frames):
//   Hook    0 -> 90   (3.0s)
//   Context 90 -> 210  (4.0s)
//   Process 210 -> 390 (6.0s)
//   Reveal  390 -> 570 (6.0s)
//   CTA     570 -> 660 (3.0s)

import type { BeatKey } from '../../types/process-video.js';

export const FPS = 30;
export const TOTAL_FRAMES = 660; // 22s @ 30fps

export const T: Record<BeatKey, { start: number; end: number }> = {
  hook:    { start: 0,   end: 90  },
  context: { start: 90,  end: 210 },
  process: { start: 210, end: 390 },
  reveal:  { start: 390, end: 570 },
  cta:     { start: 570, end: 660 },
};

/** Returns `{ from, durationInFrames }` suitable for a Remotion <Sequence>. */
export function beatRange(key: BeatKey): { from: number; durationInFrames: number } {
  const { start, end } = T[key];
  return { from: start, durationInFrames: end - start };
}

/** Convert a global frame to a beat-local frame (0-indexed). */
export function localFrame(globalFrame: number, key: BeatKey): number {
  return globalFrame - T[key].start;
}

/** Sanity check — called at module import time. Throws if timings are inconsistent. */
function assertTimings(): void {
  const keys: BeatKey[] = ['hook', 'context', 'process', 'reveal', 'cta'];
  let prevEnd = 0;
  for (const k of keys) {
    if (T[k].start !== prevEnd) {
      throw new Error(`Beat ${k} starts at ${T[k].start}, expected ${prevEnd}`);
    }
    if (T[k].end <= T[k].start) {
      throw new Error(`Beat ${k} has non-positive duration`);
    }
    prevEnd = T[k].end;
  }
  if (prevEnd !== TOTAL_FRAMES) {
    throw new Error(`Total beat frames = ${prevEnd}, expected ${TOTAL_FRAMES}`);
  }
}

assertTimings();
```

- [ ] **Step 2: Write a temp verification script**

Create `scripts/verify-process-timing.mjs`:
```js
// Temporary: exercises process-timing.ts pure logic.
// Deleted after this task.
import { T, TOTAL_FRAMES, beatRange, localFrame } from '../src/remotion/helpers/process-timing.ts';

console.log('T =', T);
console.log('TOTAL_FRAMES =', TOTAL_FRAMES);
console.log('beatRange(hook) =', beatRange('hook'));
console.log('beatRange(cta)  =', beatRange('cta'));
console.log('localFrame(95, "context") =', localFrame(95, 'context')); // expect 5
console.log('localFrame(580, "cta")    =', localFrame(580, 'cta'));    // expect 10
```

- [ ] **Step 3: Run the script**

Run:
```bash
npx tsx scripts/verify-process-timing.mjs
```
Expected output:
```
T = { hook: { start: 0, end: 90 }, context: { start: 90, end: 210 }, process: { start: 210, end: 390 }, reveal: { start: 390, end: 570 }, cta: { start: 570, end: 660 } }
TOTAL_FRAMES = 660
beatRange(hook) = { from: 0, durationInFrames: 90 }
beatRange(cta)  = { from: 570, durationInFrames: 90 }
localFrame(95, "context") = 5
localFrame(580, "cta")    = 10
```
If the `assertTimings()` call throws, the module didn't even load — fix the numbers and rerun.

- [ ] **Step 4: Delete the temp script and commit**

Run:
```bash
rm scripts/verify-process-timing.mjs
git add src/remotion/helpers/process-timing.ts
git commit -m "feat(remotion): add process-reveal timing anchors"
```

---

## Task 3: Port primitive — `BlurReveal`

**Files:**
- Create: `src/remotion/components/process/BlurReveal.tsx`

**Source:** `remocn/registry/remocn/blur-reveal/index.tsx` (already cloned at `/tmp/remotion-research/remocn`). Simplified — remove `useVideoConfig` dep (pass `durationInFrames` explicitly so we can use it INSIDE a `<Sequence>`).

- [ ] **Step 1: Write the component**

Create `src/remotion/components/process/BlurReveal.tsx`:
```tsx
import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';

interface BlurRevealProps {
  text: string;
  /** Total frames available inside the current Sequence. */
  durationInFrames: number;
  fontSize?: number;
  color?: string;
  fontWeight?: number;
  blur?: number;
  /** Fraction of durationInFrames over which the reveal completes. Default: 0.6 */
  revealFraction?: number;
}

export const BlurReveal: React.FC<BlurRevealProps> = ({
  text,
  durationInFrames,
  fontSize = 120,
  color = '#ffffff',
  fontWeight = 800,
  blur = 18,
  revealFraction = 0.6,
}) => {
  const frame = useCurrentFrame();
  const endFrame = durationInFrames * revealFraction;

  const opacity = interpolate(frame, [0, endFrame], [0, 1], {
    extrapolateRight: 'clamp',
  });
  const blurAmount = interpolate(frame, [0, endFrame], [blur, 0], {
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <span
        style={{
          opacity,
          filter: `blur(${blurAmount}px)`,
          fontSize,
          fontWeight,
          color,
          letterSpacing: '-0.04em',
          fontFamily: 'sans-serif',
          textShadow: '0 4px 24px rgba(0,0,0,0.6)',
        }}
      >
        {text}
      </span>
    </div>
  );
};
```

- [ ] **Step 2: Verify it compiles**

Run:
```bash
npm run build
```
Expected: exit 0, no errors.

- [ ] **Step 3: Commit**

```bash
git add src/remotion/components/process/BlurReveal.tsx
git commit -m "feat(remotion): port BlurReveal primitive from remocn"
```

---

## Task 4: Port primitive — `GridPixelateWipe`

**Files:**
- Create: `src/remotion/components/process/GridPixelateWipe.tsx`

**Source:** `remocn/registry/remocn/grid-pixelate-wipe/index.tsx`. Simplified: we only need the `wave` pattern, and we'll pass `durationInFrames` explicitly instead of using `useVideoConfig`.

- [ ] **Step 1: Write the component**

**Key detail for TS strict:** With `noUncheckedIndexedAccess: true`, accessing `grid[y][x]` yields `number | undefined`. This component uses a **flat `Float32Array`** keyed by `y * cols + x` to avoid nested-array indexing entirely. `Float32Array[i]` is typed as `number` (not `number | undefined`) because typed arrays are fixed-shape.

Create `src/remotion/components/process/GridPixelateWipe.tsx`:
```tsx
import React, { useMemo } from 'react';
import { interpolate, useCurrentFrame } from 'remotion';

interface GridPixelateWipeProps {
  /** The image/content underneath that gets revealed as cells fade out. */
  children: React.ReactNode;
  /** Total frames available inside the current Sequence. */
  durationInFrames: number;
  cols?: number;
  rows?: number;
  /** Frame at which cells start fading. Default: 0 (immediate). */
  transitionStart?: number;
  /** Frames from first cell starting to last cell finishing. Default: durationInFrames * 0.8 */
  transitionDuration?: number;
  /** Per-cell fade duration. Default: 6 */
  cellFadeFrames?: number;
  /** Pixel color that covers the content initially. */
  pixelColor?: string;
}

export const GridPixelateWipe: React.FC<GridPixelateWipeProps> = ({
  children,
  durationInFrames,
  cols = 14,
  rows = 24,
  transitionStart = 0,
  transitionDuration,
  cellFadeFrames = 6,
  pixelColor = '#111111',
}) => {
  const frame = useCurrentFrame();
  const totalTransition = transitionDuration ?? durationInFrames * 0.8;

  // Compute per-cell delay: wave pattern radiating from center.
  // Flat Float32Array keyed by y*cols+x to sidestep noUncheckedIndexedAccess.
  const delays = useMemo((): Float32Array => {
    const count = rows * cols;
    const raw = new Float32Array(count);
    let min = Infinity;
    let max = -Infinity;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const d = Math.hypot(x - (cols - 1) / 2, y - (rows - 1) / 2);
        raw[y * cols + x] = d;
        if (d < min) min = d;
        if (d > max) max = d;
      }
    }
    const span = Math.max(0, totalTransition - cellFadeFrames);
    const range = max - min || 1;
    const normalized = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      normalized[i] = ((raw[i] - min) / range) * span;
    }
    return normalized;
  }, [cols, rows, totalTransition, cellFadeFrames]);

  const cells: React.ReactNode[] = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const delay = delays[y * cols + x];
      const opacity = interpolate(
        frame,
        [transitionStart + delay, transitionStart + delay + cellFadeFrames],
        [1, 0],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
      );
      cells.push(
        <div
          key={`${x}-${y}`}
          style={{
            background: pixelColor,
            opacity,
          }}
        />,
      );
    }
  }

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
      }}
    >
      <div style={{ position: 'absolute', inset: 0 }}>{children}</div>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, 1fr)`,
        }}
      >
        {cells}
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Verify it compiles**

Run:
```bash
npm run build
```
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/remotion/components/process/GridPixelateWipe.tsx
git commit -m "feat(remotion): port GridPixelateWipe primitive from remocn"
```

---

## Task 5: Port primitive — `ImageExpandToFullscreen`

**Files:**
- Create: `src/remotion/components/process/ImageExpandToFullscreen.tsx`

**Source:** `remocn/registry/remocn/image-expand-to-fullscreen/index.tsx`. Heavily simplified — we don't need the faux feed/editor UI, just the spring-driven rect morph for an `<Img>`.

- [ ] **Step 1: Write the component**

Create `src/remotion/components/process/ImageExpandToFullscreen.tsx`:
```tsx
import React from 'react';
import { Img, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface ImageExpandToFullscreenProps {
  /** Resolved Remotion src URL. Caller must pass a staticFile()-wrapped string, NOT an absolute fs path. */
  src: string;
  /** Starting rect (within 1080x1920 canvas). */
  from: Rect;
  /** Ending rect (typically fullscreen). */
  to: Rect;
  /** Frame at which the morph begins. Default: 0 */
  morphAt?: number;
  borderRadiusFrom?: number;
  borderRadiusTo?: number;
}

export const ImageExpandToFullscreen: React.FC<ImageExpandToFullscreenProps> = ({
  src,
  from,
  to,
  morphAt = 0,
  borderRadiusFrom = 24,
  borderRadiusTo = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const morph = spring({
    frame: frame - morphAt,
    fps,
    config: { mass: 1.4, damping: 24, stiffness: 130 },
  });

  const left = interpolate(morph, [0, 1], [from.left, to.left]);
  const top = interpolate(morph, [0, 1], [from.top, to.top]);
  const width = interpolate(morph, [0, 1], [from.width, to.width]);
  const height = interpolate(morph, [0, 1], [from.height, to.height]);
  const radius = interpolate(morph, [0, 1], [borderRadiusFrom, borderRadiusTo]);

  return (
    <div
      style={{
        position: 'absolute',
        left,
        top,
        width,
        height,
        borderRadius: radius,
        overflow: 'hidden',
        boxShadow:
          '0 40px 100px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.06)',
      }}
    >
      <Img
        src={src}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
        }}
      />
    </div>
  );
};
```

- [ ] **Step 2: Verify it compiles**

Run:
```bash
npm run build
```
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/remotion/components/process/ImageExpandToFullscreen.tsx
git commit -m "feat(remotion): port ImageExpandToFullscreen primitive from remocn"
```

---

## Task 6: Port primitive — `StaggeredFadeUp`

**Files:**
- Create: `src/remotion/components/process/StaggeredFadeUp.tsx`

**Purpose:** Used by `BeatProcess` to fade in grid thumbnails one after another. Kept small and generic — it just takes children and fades them in with a per-index delay.

- [ ] **Step 1: Write the component**

Create `src/remotion/components/process/StaggeredFadeUp.tsx`:
```tsx
import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';

interface StaggeredFadeUpProps {
  children: React.ReactNode[];
  /** Frame at which the first item starts. Default: 0 */
  startFrame?: number;
  /** Frames between each item. Default: 6 */
  staggerFrames?: number;
  /** Y translation in px for the initial state. Default: 24 */
  translateY?: number;
}

export const StaggeredFadeUp: React.FC<StaggeredFadeUpProps> = ({
  children,
  startFrame = 0,
  staggerFrames = 6,
  translateY = 24,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <>
      {React.Children.map(children, (child, i) => {
        const progress = spring({
          frame: frame - startFrame - i * staggerFrames,
          fps,
          config: { damping: 14, stiffness: 110, mass: 0.7 },
          durationInFrames: 28,
        });
        return (
          <div
            style={{
              opacity: progress,
              transform: `translateY(${(1 - progress) * translateY}px)`,
              willChange: 'transform, opacity',
            }}
          >
            {child}
          </div>
        );
      })}
    </>
  );
};
```

- [ ] **Step 2: Verify it compiles**

Run:
```bash
npm run build
```
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/remotion/components/process/StaggeredFadeUp.tsx
git commit -m "feat(remotion): add StaggeredFadeUp primitive"
```

---

## Task 7: Port primitive — `ShimmerSweep`

**Files:**
- Create: `src/remotion/components/process/ShimmerSweep.tsx`

**Purpose:** Diagonal shine sweep applied on top of the final reveal image to signal "quality".

- [ ] **Step 1: Write the component**

Create `src/remotion/components/process/ShimmerSweep.tsx`:
```tsx
import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';

interface ShimmerSweepProps {
  /** Frame at which the shimmer starts. Default: 0 */
  startFrame?: number;
  /** Sweep duration in frames. Default: 30 */
  durationInFrames?: number;
  /** Shimmer band color. Default: 'rgba(255,255,255,0.5)' */
  color?: string;
}

export const ShimmerSweep: React.FC<ShimmerSweepProps> = ({
  startFrame = 0,
  durationInFrames = 30,
  color = 'rgba(255,255,255,0.5)',
}) => {
  const frame = useCurrentFrame();
  const local = frame - startFrame;

  // Position 0..1 across the sweep; -1 -> 2 translates across screen with overshoot.
  const progress = interpolate(local, [0, durationInFrames], [-1, 2], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        mixBlendMode: 'screen',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '-50%',
          bottom: '-50%',
          width: '40%',
          left: `${progress * 100}%`,
          background: `linear-gradient(120deg, transparent 0%, ${color} 50%, transparent 100%)`,
          transform: 'skewX(-12deg)',
        }}
      />
    </div>
  );
};
```

- [ ] **Step 2: Verify it compiles**

Run:
```bash
npm run build
```
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/remotion/components/process/ShimmerSweep.tsx
git commit -m "feat(remotion): add ShimmerSweep primitive"
```

---

## Task 8: Port primitive — `SuccessConfetti`

**Files:**
- Create: `src/remotion/components/process/SuccessConfetti.tsx`

**Source:** Adapted from the outro `particles` block inside `remocn/product-launch-trailer/index.tsx`. Standalone here.

- [ ] **Step 1: Write the component**

Create `src/remotion/components/process/SuccessConfetti.tsx`:
```tsx
import React from 'react';
import { interpolate, random, useCurrentFrame } from 'remotion';

interface SuccessConfettiProps {
  /** Frame at which confetti bursts. Default: 0 */
  startFrame?: number;
  /** Number of particles. Default: 80 */
  count?: number;
  /** Accent hex colors. Default: built-in mint/peach/lavender/yellow palette. */
  colors?: readonly string[];
  /** Viewport width for particle math. Default: 1080 */
  width?: number;
  /** Viewport height for particle math. Default: 1920 */
  height?: number;
}

const DEFAULT_COLORS = ['#A1EEBD', '#FFB38E', '#D4B3FF', '#FCD34D'] as const;

export const SuccessConfetti: React.FC<SuccessConfettiProps> = ({
  startFrame = 0,
  count = 80,
  colors,
  width = 1080,
  height = 1920,
}) => {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - startFrame);

  // Palette is guaranteed non-empty; use a local with a typed fallback so the
  // index access returns `string` under noUncheckedIndexedAccess.
  const palette: readonly string[] =
    colors !== undefined && colors.length > 0 ? colors : DEFAULT_COLORS;

  const particles = Array.from({ length: count }, (_, i) => {
    const angle = random(`c:${i}:a`) * Math.PI * 2;
    const v = 14 + random(`c:${i}:v`) * 14;
    const sz = 8 + random(`c:${i}:s`) * 10;
    const localF = Math.max(0, f - Math.floor(random(`c:${i}:d`) * 6));
    const cx = width / 2 + Math.cos(angle) * v * localF;
    const cy = height / 2 + Math.sin(angle) * v * localF + 0.6 * localF * localF;
    const colorIdx = Math.floor(random(`c:${i}:c`) * palette.length);
    // Safe under noUncheckedIndexedAccess: colorIdx is clamped to a valid index.
    const color = palette[colorIdx] ?? palette[0]!;
    const opacity = interpolate(localF, [0, 4, 48, 64], [0, 1, 1, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    return { cx, cy, sz, color, opacity, key: i };
  });

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
    >
      {particles.map((p) => (
        <rect
          key={p.key}
          x={p.cx - p.sz / 2}
          y={p.cy - p.sz / 2}
          width={p.sz}
          height={p.sz * 0.55}
          rx={1}
          fill={p.color}
          opacity={p.opacity}
        />
      ))}
    </svg>
  );
};
```

- [ ] **Step 2: Verify it compiles**

Run:
```bash
npm run build
```
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/remotion/components/process/SuccessConfetti.tsx
git commit -m "feat(remotion): add SuccessConfetti primitive"
```

---

## Task 9: Beat 1 — `BeatHook`

**Files:**
- Create: `src/remotion/components/process/BeatHook.tsx`

**Behavior:** 3 seconds. The final product image is covered by `GridPixelateWipe` (cells fading out in a wave pattern). `BlurReveal` renders `hook_text` on top. Ends on the product just becoming visible.

- [ ] **Step 1: Write the beat**

Create `src/remotion/components/process/BeatHook.tsx`:
```tsx
import React from 'react';
import { AbsoluteFill, Img } from 'remotion';
import { resolveSrc } from '../../helpers/resolve-src.js';
import { GridPixelateWipe } from './GridPixelateWipe.js';
import { BlurReveal } from './BlurReveal.js';

interface BeatHookProps {
  /** publicDir-relative path to the final product shot. Empty string → colored placeholder (Studio preview). */
  finalShot: string;
  hookText: string;
  durationInFrames: number;
}

export const BeatHook: React.FC<BeatHookProps> = ({
  finalShot,
  hookText,
  durationInFrames,
}) => {
  return (
    <AbsoluteFill style={{ background: '#0a0a0a' }}>
      <GridPixelateWipe
        durationInFrames={durationInFrames}
        cols={14}
        rows={24}
        cellFadeFrames={6}
      >
        {finalShot !== '' ? (
          <Img
            src={resolveSrc(finalShot)}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', background: '#2a3440' }} />
        )}
      </GridPixelateWipe>
      <BlurReveal
        text={hookText}
        durationInFrames={durationInFrames}
        fontSize={160}
        color="#ffffff"
      />
    </AbsoluteFill>
  );
};
```

- [ ] **Step 2: Verify it compiles**

Run:
```bash
npm run build
```
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/remotion/components/process/BeatHook.tsx
git commit -m "feat(remotion): add BeatHook (beat 1 — pixelated hook)"
```

---

## Task 10: Beat 2 — `BeatContext`

**Files:**
- Create: `src/remotion/components/process/BeatContext.tsx`

**Behavior:** 4 seconds. The raw phone photo appears small/centered with a slight rotation and shadow (like a phone on a surface). `context_text` blur-reveals below it.

- [ ] **Step 1: Write the beat**

Create `src/remotion/components/process/BeatContext.tsx`:
```tsx
import React from 'react';
import { AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { resolveSrc } from '../../helpers/resolve-src.js';
import { BlurReveal } from './BlurReveal.js';

interface BeatContextProps {
  /** publicDir-relative path to the raw phone photo. Empty string → colored placeholder. */
  rawPhoto: string;
  contextText: string;
  durationInFrames: number;
}

export const BeatContext: React.FC<BeatContextProps> = ({
  rawPhoto,
  contextText,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 120, mass: 0.8 },
  });
  const scale = interpolate(enter, [0, 1], [0.85, 1]);
  const rotate = interpolate(enter, [0, 1], [-8, -3]);
  const opacity = interpolate(enter, [0, 1], [0, 1]);

  return (
    <AbsoluteFill
      style={{
        background: '#0a0a0a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: 720,
          height: 1080,
          transform: `rotate(${rotate}deg) scale(${scale})`,
          opacity,
          overflow: 'hidden',
          borderRadius: 32,
          boxShadow:
            '0 40px 120px rgba(0,0,0,0.7), 0 0 0 8px rgba(255,255,255,0.08)',
        }}
      >
        {rawPhoto !== '' ? (
          <Img
            src={resolveSrc(rawPhoto)}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', background: '#4a5263' }} />
        )}
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: 220,
          left: 0,
          right: 0,
        }}
      >
        <BlurReveal
          text={contextText}
          durationInFrames={durationInFrames}
          fontSize={96}
          color="#ffffff"
        />
      </div>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 2: Verify it compiles**

Run:
```bash
npm run build
```
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/remotion/components/process/BeatContext.tsx
git commit -m "feat(remotion): add BeatContext (beat 2 — raw phone photo)"
```

---

## Task 11: Beat 3 — `BeatProcess`

**Files:**
- Create: `src/remotion/components/process/BeatProcess.tsx`

**Behavior:** 6 seconds. The workflow/grid image fills the frame with a scale-in. A grid of 4 placeholder cards staggers on top to mimic "prompts running" (decorative). `process_text` overlay.

- [ ] **Step 1: Write the beat**

Create `src/remotion/components/process/BeatProcess.tsx`:
```tsx
import React from 'react';
import { AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { resolveSrc } from '../../helpers/resolve-src.js';
import { BlurReveal } from './BlurReveal.js';
import { StaggeredFadeUp } from './StaggeredFadeUp.js';

interface BeatProcessProps {
  /** publicDir-relative path to the workflow/grid screenshot. Empty string → colored placeholder. */
  workflowImage: string;
  processText: string;
  durationInFrames: number;
}

export const BeatProcess: React.FC<BeatProcessProps> = ({
  workflowImage,
  processText,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = spring({ frame, fps, config: { damping: 18, stiffness: 90 } });
  const scale = interpolate(enter, [0, 1], [1.1, 1]);
  const opacity = interpolate(enter, [0, 1], [0, 1]);

  return (
    <AbsoluteFill style={{ background: '#0a0a0a' }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: `scale(${scale})`,
          opacity,
        }}
      >
        {workflowImage !== '' ? (
          <Img
            src={resolveSrc(workflowImage)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              filter: 'brightness(0.55) blur(3px)',
            }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', background: '#1a2230' }} />
        )}
      </div>

      {/* Decorative staggered cards over the workflow background */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gridTemplateRows: '1fr 1fr',
          gap: 40,
          padding: 120,
        }}
      >
        <StaggeredFadeUp startFrame={20} staggerFrames={10}>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 24,
                backdropFilter: 'blur(8px)',
              }}
            />
          ))}
        </StaggeredFadeUp>
      </div>

      <BlurReveal
        text={processText}
        durationInFrames={durationInFrames}
        fontSize={110}
        color="#ffffff"
      />
    </AbsoluteFill>
  );
};
```

- [ ] **Step 2: Verify it compiles**

Run:
```bash
npm run build
```
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/remotion/components/process/BeatProcess.tsx
git commit -m "feat(remotion): add BeatProcess (beat 3 — workflow reveal)"
```

---

## Task 12: Beat 4 — `BeatReveal`

**Files:**
- Create: `src/remotion/components/process/BeatReveal.tsx`

**Behavior:** 6 seconds. The final product shot morphs from a small centered thumbnail to fullscreen using `ImageExpandToFullscreen`. At frame ~60 a `ShimmerSweep` fires across it. `reveal_text` appears at the bottom at frame ~100.

- [ ] **Step 1: Write the beat**

Create `src/remotion/components/process/BeatReveal.tsx`:
```tsx
import React from 'react';
import { AbsoluteFill, Img, Sequence } from 'remotion';
import { resolveSrc } from '../../helpers/resolve-src.js';
import { ImageExpandToFullscreen } from './ImageExpandToFullscreen.js';
import { ShimmerSweep } from './ShimmerSweep.js';
import { BlurReveal } from './BlurReveal.js';

interface BeatRevealProps {
  /** publicDir-relative path to the final product shot. Empty string → colored placeholder. */
  finalShot: string;
  revealText: string;
  durationInFrames: number;
}

// Inner guard: the text sub-sequence must have a positive duration even if the
// beat is retimed to <100 frames via T. Math.max prevents Remotion from throwing.
const TEXT_FROM = 100;

export const BeatReveal: React.FC<BeatRevealProps> = ({
  finalShot,
  revealText,
  durationInFrames,
}) => {
  const textDuration = Math.max(1, durationInFrames - TEXT_FROM);

  return (
    <AbsoluteFill style={{ background: '#0a0a0a' }}>
      {finalShot !== '' ? (
        <ImageExpandToFullscreen
          src={resolveSrc(finalShot)}
          from={{ left: 340, top: 700, width: 400, height: 520 }}
          to={{ left: 0, top: 0, width: 1080, height: 1920 }}
          morphAt={0}
          borderRadiusFrom={32}
          borderRadiusTo={0}
        />
      ) : (
        <div
          style={{ position: 'absolute', inset: 0, background: '#2a3440' }}
        />
      )}
      <Sequence from={60} durationInFrames={30}>
        <ShimmerSweep startFrame={0} durationInFrames={30} />
      </Sequence>
      <Sequence from={TEXT_FROM} durationInFrames={textDuration}>
        <div
          style={{
            position: 'absolute',
            bottom: 260,
            left: 0,
            right: 0,
          }}
        >
          <BlurReveal
            text={revealText}
            durationInFrames={textDuration}
            fontSize={110}
            color="#ffffff"
          />
        </div>
      </Sequence>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 2: Verify it compiles**

Run:
```bash
npm run build
```
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/remotion/components/process/BeatReveal.tsx
git commit -m "feat(remotion): add BeatReveal (beat 4 — product morph + shimmer)"
```

---

## Task 13: Beat 5 — `BeatCTA`

**Files:**
- Create: `src/remotion/components/process/BeatCTA.tsx`

**Behavior:** 3 seconds. Clean dark background. `cta_text` drops in with a spring, `handle` appears below it, `SuccessConfetti` bursts behind them.

- [ ] **Step 1: Write the beat**

Create `src/remotion/components/process/BeatCTA.tsx`:
```tsx
import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { SuccessConfetti } from './SuccessConfetti.js';

interface BeatCTAProps {
  ctaText: string;
  handle: string;
  accentColor: string;
  /** Total frames of the beat. Currently unused inside BeatCTA but kept on the
   *  interface so the composition can pass it uniformly with other beats. */
  durationInFrames: number;
}

export const BeatCTA: React.FC<BeatCTAProps> = ({
  ctaText,
  handle,
  accentColor,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const drop = spring({
    frame: frame - 6,
    fps,
    config: { damping: 14, stiffness: 110, mass: 0.7 },
    durationInFrames: 28,
  });
  const y = interpolate(drop, [0, 1], [-60, 0]);
  const opacity = interpolate(drop, [0, 1], [0, 1]);

  return (
    <AbsoluteFill
      style={{
        background: '#0a0a0a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 40,
      }}
    >
      <SuccessConfetti
        startFrame={0}
        colors={[accentColor, '#FFB38E', '#D4B3FF', '#FCD34D']}
      />
      <div
        style={{
          transform: `translateY(${y}px)`,
          opacity,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontFamily: 'sans-serif',
            fontSize: 140,
            fontWeight: 800,
            color: '#ffffff',
            letterSpacing: '-0.04em',
            textShadow: `0 0 80px ${accentColor}88`,
          }}
        >
          {ctaText}
        </div>
        <div
          style={{
            fontFamily: 'sans-serif',
            fontSize: 64,
            fontWeight: 500,
            color: accentColor,
            marginTop: 24,
            letterSpacing: '0.01em',
          }}
        >
          {handle}
        </div>
      </div>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 2: Verify it compiles**

Run:
```bash
npm run build
```
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/remotion/components/process/BeatCTA.tsx
git commit -m "feat(remotion): add BeatCTA (beat 5 — CTA + confetti)"
```

---

## Task 14: Composition — `ProcessReveal`

**Files:**
- Create: `src/remotion/compositions/ProcessReveal.tsx`

**Behavior:** Sequences all five beats using the `T` anchor object. Takes `ProcessVideoProps` and feeds absolute asset paths down to each beat.

- [ ] **Step 1: Write the composition**

Create `src/remotion/compositions/ProcessReveal.tsx`:
```tsx
import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { beatRange } from '../helpers/process-timing.js';
import { BeatHook } from '../components/process/BeatHook.js';
import { BeatContext } from '../components/process/BeatContext.js';
import { BeatProcess } from '../components/process/BeatProcess.js';
import { BeatReveal } from '../components/process/BeatReveal.js';
import { BeatCTA } from '../components/process/BeatCTA.js';
import type { ProcessVideoProps } from '../../types/process-video.js';

export const ProcessReveal: React.FC<ProcessVideoProps> = ({
  config,
  publicAssets,
}) => {
  const accent = config.accent_color ?? '#A1EEBD';
  const hook = beatRange('hook');
  const ctx = beatRange('context');
  const proc = beatRange('process');
  const reveal = beatRange('reveal');
  const cta = beatRange('cta');

  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <Sequence from={hook.from} durationInFrames={hook.durationInFrames}>
        <BeatHook
          finalShot={publicAssets.final_shot}
          hookText={config.beats.hook_text}
          durationInFrames={hook.durationInFrames}
        />
      </Sequence>
      <Sequence from={ctx.from} durationInFrames={ctx.durationInFrames}>
        <BeatContext
          rawPhoto={publicAssets.raw_photo}
          contextText={config.beats.context_text}
          durationInFrames={ctx.durationInFrames}
        />
      </Sequence>
      <Sequence from={proc.from} durationInFrames={proc.durationInFrames}>
        <BeatProcess
          workflowImage={publicAssets.workflow_image}
          processText={config.beats.process_text}
          durationInFrames={proc.durationInFrames}
        />
      </Sequence>
      <Sequence from={reveal.from} durationInFrames={reveal.durationInFrames}>
        <BeatReveal
          finalShot={publicAssets.final_shot}
          revealText={config.beats.reveal_text}
          durationInFrames={reveal.durationInFrames}
        />
      </Sequence>
      <Sequence from={cta.from} durationInFrames={cta.durationInFrames}>
        <BeatCTA
          ctaText={config.beats.cta_text}
          handle={config.handle}
          accentColor={accent}
          durationInFrames={cta.durationInFrames}
        />
      </Sequence>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 2: Verify it compiles**

Run:
```bash
npm run build
```
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/remotion/compositions/ProcessReveal.tsx
git commit -m "feat(remotion): add ProcessReveal composition sequencing all beats"
```

---

## Task 15: Register `ProcessReveal` in `Root.tsx`

**Files:**
- Modify: `src/remotion/Root.tsx`

**Note on Studio preview:** Remotion Studio uses a default `publicDir` that is *not* the project-specific path the renderer uses (`projects/{name}`). So `staticFile()` strings in `defaultProps` would 404 in Studio for any project. The beat components handle this by rendering a colored placeholder when the asset path is an empty string. We pass **empty strings** for assets in `defaultProps`, so Studio preview shows the beat layout/text/timings against solid colors — which is what you want to iterate on. Real images only appear at render time when the pipeline passes `inputProps`. This is the cleanest separation and avoids hardcoding a fixture path that might not exist.

- [ ] **Step 1: Add imports**

In `src/remotion/Root.tsx`, at the top alongside other composition imports, add:
```ts
import { ProcessReveal } from './compositions/ProcessReveal.js';
import { TOTAL_FRAMES } from './helpers/process-timing.js';
import type { ProcessVideoProps } from '../types/process-video.js';
```

- [ ] **Step 2: Add default props for studio preview**

Still in `src/remotion/Root.tsx`, below the existing `DEFAULT_PROPS` constant, add:
```ts
// Studio preview props. All asset paths are empty strings — beat components
// render colored placeholders when paths are empty, so Studio shows layout/text/
// timings without needing a specific fixture under Studio's publicDir.
// The renderer passes real publicDir-relative paths via inputProps at render time.
const PROCESS_REVEAL_DEFAULT_PROPS: ProcessVideoProps = {
  config: {
    video_id: 'studio-preview',
    product_name: 'Preview Product',
    assets: {
      raw_photo: '',
      workflow_image: '',
      final_shot: '',
    },
    beats: {
      hook_text: 'AI trick',
      context_text: 'This is all I shot',
      process_text: 'One prompt later...',
      reveal_text: 'Studio quality',
      cta_text: 'DM for yours',
    },
    handle: '@mirastudio',
    accent_color: '#A1EEBD',
    speed: 1.0,
  },
  publicAssets: {
    raw_photo: '',
    workflow_image: '',
    final_shot: '',
  },
};
```

- [ ] **Step 3: Register the composition**

Inside the `<>` fragment returned by `RemotionRoot`, add:
```tsx
<Composition
  id="ProcessReveal"
  component={ProcessReveal}
  durationInFrames={TOTAL_FRAMES}
  fps={30}
  width={1080}
  height={1920}
  defaultProps={PROCESS_REVEAL_DEFAULT_PROPS}
/>
```

- [ ] **Step 4: Verify it compiles**

Run:
```bash
npm run build
```
Expected: exit 0.

- [ ] **Step 5: Visual verify in Remotion Studio**

Run:
```bash
npm run remotion
```
In the opened browser:
1. Click the `ProcessReveal` composition in the left sidebar.
2. Press Play — scrub through the 22s timeline.
3. Because `defaultProps` pass empty strings for all assets, images render as colored placeholder rectangles. Verify beat layout/text/timing:
   - 0-3s: solid dark-grey rect with pixelated wipe revealing it, "AI trick" text blur-reveals to sharp
   - 3-7s: rotated grey card centered, "This is all I shot" below
   - 7-13s: dark background, 4 staggered cards fade in over `BeatProcess`, "One prompt later..." text
   - 13-19s: placeholder rect springs small → fullscreen, shimmer at ~15s, "Studio quality" at ~16.3s
   - 19-22s: dark background, "DM for yours" + "@mirastudio" + confetti burst

Close the studio when satisfied. **If any beat looks broken, go back to its task and fix it in a new commit** (do NOT amend).
**Real images** will appear at render time in Task 18.

- [ ] **Step 6: Commit**

```bash
git add src/remotion/Root.tsx
git commit -m "feat(remotion): register ProcessReveal composition"
```

---

## Task 16: Pipeline module — `process-video.ts`

**Files:**
- Create: `src/pipeline/process-video.ts`

**Behavior:** Pure logic — loads a JSON config, validates asset files exist (by resolving to absolute paths), then passes the ORIGINAL project-relative strings (already publicDir-relative because `publicDir = projects/{projectName}`) into Remotion. Renders via `@remotion/bundler` + `@remotion/renderer`. Returns the output MP4 path.

**CRITICAL — mirror the existing pipeline's bundle pattern** at `src/pipeline/index.ts:833-890`:
- `publicDir` must be set to `projects/{projectName}`
- `webpackOverride` must include `extensionAlias: { '.js': ['.tsx', '.ts', '.js'] }`
- `inputProps.publicAssets` must contain publicDir-relative strings, NOT absolute paths

- [ ] **Step 1: Write the pipeline module**

Create `src/pipeline/process-video.ts`:
```ts
import path from 'node:path';
import fs from 'fs-extra';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { logger } from '../utils/logger.js';
import type {
  ProcessVideoAssets,
  ProcessVideoConfig,
  ProcessVideoProps,
} from '../types/process-video.js';

const PROJECT_ROOT = process.cwd();
const REMOTION_ENTRY = path.join(PROJECT_ROOT, 'src/remotion/Root.tsx');

interface RenderProcessVideoOptions {
  projectName: string;
  videoId: string;
  dryRun?: boolean;
}

export async function loadProcessVideoConfig(
  projectName: string,
  videoId: string,
): Promise<ProcessVideoConfig> {
  const configPath = path.join(
    PROJECT_ROOT,
    'projects',
    projectName,
    'process-videos',
    `${videoId}.json`,
  );
  if (!(await fs.pathExists(configPath))) {
    throw new Error(`Process video config not found: ${configPath}`);
  }
  const raw = (await fs.readJson(configPath)) as unknown;
  assertValidConfig(raw);
  return raw;
}

function assertValidConfig(raw: unknown): asserts raw is ProcessVideoConfig {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('Process video config must be an object');
  }
  const c = raw as Record<string, unknown>;
  const required = ['video_id', 'product_name', 'assets', 'beats', 'handle'];
  for (const key of required) {
    if (!(key in c)) {
      throw new Error(`Process video config missing required field: ${key}`);
    }
  }
  const assets = c.assets as Record<string, unknown>;
  for (const key of ['raw_photo', 'workflow_image', 'final_shot']) {
    if (typeof assets[key] !== 'string') {
      throw new Error(`Process video config.assets.${key} must be a string`);
    }
  }
  const beats = c.beats as Record<string, unknown>;
  for (const key of [
    'hook_text',
    'context_text',
    'process_text',
    'reveal_text',
    'cta_text',
  ]) {
    if (typeof beats[key] !== 'string' || (beats[key] as string).length === 0) {
      throw new Error(`Process video config.beats.${key} must be a non-empty string`);
    }
  }
}

/**
 * Validate that each asset file exists relative to the project directory,
 * and return the SAME relative strings (normalized with forward slashes) for
 * use as publicDir-relative paths in Remotion. We do NOT return absolute paths —
 * Remotion cannot serve those.
 */
export async function validatePublicAssets(
  projectName: string,
  config: ProcessVideoConfig,
): Promise<ProcessVideoAssets> {
  const projectDir = path.join(PROJECT_ROOT, 'projects', projectName);
  const check = async (rel: string, field: string): Promise<string> => {
    const abs = path.resolve(projectDir, rel);
    if (!(await fs.pathExists(abs))) {
      throw new Error(`Asset not found for ${field}: ${abs}`);
    }
    // Normalize to forward slashes so staticFile() works cross-platform.
    return rel.split(path.sep).join('/');
  };
  return {
    raw_photo: await check(config.assets.raw_photo, 'raw_photo'),
    workflow_image: await check(config.assets.workflow_image, 'workflow_image'),
    final_shot: await check(config.assets.final_shot, 'final_shot'),
  };
}

export async function renderProcessVideo(
  opts: RenderProcessVideoOptions,
): Promise<string> {
  const { projectName, videoId, dryRun = false } = opts;
  logger.step(`Loading process video config: ${projectName}/${videoId}`);
  const config = await loadProcessVideoConfig(projectName, videoId);
  const publicAssets = await validatePublicAssets(projectName, config);

  const outputDir = path.join(
    PROJECT_ROOT,
    'projects',
    projectName,
    'output',
    'process-videos',
  );
  await fs.ensureDir(outputDir);
  const outputPath = path.join(outputDir, `${videoId}.mp4`);

  if (dryRun) {
    logger.info('--- DRY RUN ---');
    logger.info(`Would render: ${outputPath}`);
    logger.info(`publicAssets: ${JSON.stringify(publicAssets, null, 2)}`);
    return outputPath;
  }

  logger.step('Bundling Remotion project...');
  // publicDir = projects/{projectName} makes the project folder the root that
  // staticFile() serves from. extensionAlias tells webpack to resolve `.js`
  // imports to `.tsx`/`.ts` source files. This matches the pattern used in
  // src/pipeline/index.ts:833-857.
  const publicDir = path.join(PROJECT_ROOT, 'projects', projectName);
  const bundleLocation = await bundle({
    entryPoint: REMOTION_ENTRY,
    publicDir,
    webpackOverride: (webpackConfig) => ({
      ...webpackConfig,
      resolve: {
        ...webpackConfig.resolve,
        extensionAlias: {
          '.js': ['.tsx', '.ts', '.js'],
        },
      },
    }),
  });

  const inputProps: ProcessVideoProps = { config, publicAssets };

  logger.step('Selecting composition...');
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: 'ProcessReveal',
    inputProps,
  });

  logger.step(`Rendering ${videoId}.mp4 (1080x1920 @ 30fps)...`);
  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: 'h264',
    outputLocation: outputPath,
    inputProps,
    onProgress: ({ progress }) => {
      const pct = Math.round(progress * 100);
      if (pct % 10 === 0) {
        logger.info(`  Render progress: ${pct}%`);
      }
    },
  });

  logger.success(`Rendered: ${outputPath}`);
  return outputPath;
}
```

- [ ] **Step 2: Verify it compiles**

Run:
```bash
npm run build
```
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/pipeline/process-video.ts
git commit -m "feat(pipeline): add process-video renderer"
```

---

## Task 17: CLI entry — `process-video.ts`

**Files:**
- Create: `src/cli/process-video.ts`
- Modify: `package.json` (add script)

- [ ] **Step 1: Write the CLI**

Create `src/cli/process-video.ts`:
```ts
#!/usr/bin/env node
import 'dotenv/config';
import { program } from 'commander';
import { renderProcessVideo } from '../pipeline/process-video.js';
import { logger } from '../utils/logger.js';

program
  .requiredOption('--project <name>', 'Project folder under projects/')
  .requiredOption('--video <id>', 'Video id (filename of the config JSON without extension)')
  .option('--dry-run', 'Validate config and asset paths but do not render')
  .parse();

const opts = program.opts<{
  project: string;
  video: string;
  dryRun?: boolean;
}>();

async function main(): Promise<void> {
  // With exactOptionalPropertyTypes, only spread dryRun when it's true so we
  // never pass `dryRun: false` into an optional field.
  const output = await renderProcessVideo({
    projectName: opts.project,
    videoId: opts.video,
    ...(opts.dryRun === true ? { dryRun: true as const } : {}),
  });
  if (opts.dryRun === true) {
    logger.success(`Dry run OK. Would output: ${output}`);
  } else {
    logger.success(`Done: ${output}`);
  }
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  logger.error(`process-video failed: ${message}`);
  if (err instanceof Error && err.stack) {
    logger.info(err.stack);
  }
  process.exit(1);
});
```

- [ ] **Step 2: Add the script to package.json**

Open `package.json`. The current `"scripts"` object looks like this (whitespace may differ slightly):
```json
"scripts": {
  "start": "tsx src/cli/run-pipeline.ts",
  "new-project": "tsx src/cli/new-project.ts",
  "pipeline": "tsx src/cli/run-pipeline.ts",
  "remotion": "remotion studio",
  "build": "tsc --noEmit"
}
```

Replace it with:
```json
"scripts": {
  "start": "tsx src/cli/run-pipeline.ts",
  "new-project": "tsx src/cli/new-project.ts",
  "pipeline": "tsx src/cli/run-pipeline.ts",
  "process-video": "tsx src/cli/process-video.ts",
  "remotion": "remotion studio",
  "build": "tsc --noEmit"
}
```

Then verify the JSON still parses:
```bash
node -e "JSON.parse(require('fs').readFileSync('package.json','utf8')); console.log('OK')"
```
Expected: `OK`. If it errors, check for a stray/missing comma.

- [ ] **Step 3: Dry-run against the test fixture**

Run:
```bash
npm run process-video -- --project _test-process --video test --dry-run
```
Expected output includes (exact paths may differ slightly):
```
... Loading process video config: _test-process/test
... --- DRY RUN ---
... Would render: .../projects/_test-process/output/process-videos/test.mp4
... publicAssets: {
...   "raw_photo": "process-videos/assets/phone.jpg",
...   "workflow_image": "process-videos/assets/workflow.jpg",
...   "final_shot": "output/images/final.jpg"
... }
... Dry run OK. ...
```
If it errors with "Asset not found" — go back to Task 0 and make sure the fixture files exist at the exact paths listed in the test config.
If it errors with "Cannot find module" during compile — check that `src/pipeline/process-video.ts` imports `.js` extensions (the codebase convention) and that Task 1's types file was saved with the correct `publicAssets` field.

- [ ] **Step 4: Commit**

```bash
git add src/cli/process-video.ts package.json
git commit -m "feat(cli): add process-video CLI entry"
```

---

## Task 18: End-to-end render test

**Files:** None (this is a verification-only task).

- [ ] **Step 1: Render the test fixture for real**

Run:
```bash
npm run process-video -- --project _test-process --video test
```
Expected: logs show bundling → rendering → success. Takes ~30-90s depending on machine.

- [ ] **Step 2: Inspect the output file**

Run:
```bash
ls -lh projects/_test-process/output/process-videos/test.mp4
ffprobe -v error -show_entries format=duration,size:stream=width,height,codec_type projects/_test-process/output/process-videos/test.mp4
```
Expected:
- File exists, >500KB
- `width=1080`, `height=1920`
- `duration=22.0` (±0.2)
- Two streams only if we added audio (we didn't — one video stream is correct)

- [ ] **Step 3: Play the video**

Run:
```bash
open projects/_test-process/output/process-videos/test.mp4
```
Watch the whole thing. This render uses the **real fixture images** (unlike Studio preview which showed placeholders). Check:
- [ ] Beat 1 (0-3s): pixels wipe away revealing the `final.jpg` image, "AI trick" text
- [ ] Beat 2 (3-7s): rotated `phone.jpg` card centered, "This is all I shot" text
- [ ] Beat 3 (7-13s): blurred `workflow.jpg` background, 4 cards stagger in, "One prompt later..." text
- [ ] Beat 4 (13-19s): `final.jpg` morphs from small rect to fullscreen, shimmer sweep at ~15s, "Studio quality" text at ~16.3s
- [ ] Beat 5 (19-22s): dark background, "DM for yours", "@mirastudio", confetti burst
- [ ] No beats drop out, no black frames between beats, no crashes
- [ ] All images actually load (not broken-image icons) — if any fail, the `publicDir` + `staticFile` plumbing is wrong, re-check Task 16

- [ ] **Step 4: If any beat looks broken**

Go back to that beat's task, fix the issue, make a **new commit** (never `--amend`), and re-run this task.

- [ ] **Step 5: Commit nothing (verification-only)**

If everything looks good, no commit needed. Move to final task.

---

## Task 19: Documentation and example template

**Files:**
- Create: `projects/_templates/process-video.json`
- Modify: `CLAUDE.md` (add a new short section)

- [ ] **Step 1: Create the documented example template**

Create `projects/_templates/process-video.json`:
```json
{
  "video_id": "hoodie-reveal",
  "product_name": "Tyre Black Hoodie",
  "_comment_assets": "All paths are relative to projects/{project}/",
  "assets": {
    "raw_photo": "process-videos/assets/hoodie-phone.jpg",
    "workflow_image": "process-videos/assets/hoodie-workflow.jpg",
    "final_shot": "output/images/hoodie-hero.jpg"
  },
  "_comment_beats": "5 short text strings, one per beat. Keep each under ~24 chars for legibility.",
  "beats": {
    "hook_text": "AI trick",
    "context_text": "This is all I shot",
    "process_text": "One prompt later...",
    "reveal_text": "Studio quality",
    "cta_text": "DM for yours"
  },
  "handle": "@mirastudio",
  "_comment_style": "accent_color drives confetti/CTA glow. speed is a multiplier.",
  "accent_color": "#A1EEBD",
  "speed": 1.0
}
```

(Note: JSON doesn't really support comments, but unused keys starting with `_` are ignored by the validator since it only checks required fields. If the validator is tightened later, remove them.)

- [ ] **Step 2: Add a section to CLAUDE.md**

In `CLAUDE.md`, below the existing `## Modes` table, add a new section:

```markdown
---

## Process-Reveal Videos (TikTok)

A separate sub-mode for short vertical process-reveal videos (22s, 5 beats) for TikTok/Reels.
Does not call any AI providers — pure Remotion composition of existing project assets.

**Run:**
```bash
npm run process-video -- --project {name} --video {video_id}
npm run process-video -- --project {name} --video {video_id} --dry-run
```

**Inputs per video:**
- Config: `projects/{name}/process-videos/{video_id}.json` (see `projects/_templates/process-video.json`)
- `raw_photo` — the phone shot you took of the product (project-relative path)
- `workflow_image` — a screenshot/grid from your generation workflow
- `final_shot` — the polished engine output

**Output:** `projects/{name}/output/process-videos/{video_id}.mp4` (1080x1920, H.264, 22s)

**Preview in Remotion Studio:** `npm run remotion` → select `ProcessReveal` composition.
Studio preview shows colored placeholder rectangles in place of the three asset images
(since Studio's default publicDir can't find project-specific assets). Real images
only appear at render time via the pipeline's `inputProps`.
```

- [ ] **Step 3: Commit**

```bash
git add projects/_templates/process-video.json CLAUDE.md
git commit -m "docs: document process-reveal video mode"
```

---

## Done

All 20 tasks (Task 0 through Task 19) complete. The engine now has:

- A `process-video` CLI command (`npm run process-video -- --project X --video Y`)
- A `ProcessReveal` Remotion composition, visible in `npm run remotion` studio
- A reusable `src/remotion/components/process/` library of 6 primitives + 5 beat components
- A single `T` timing anchor in `src/remotion/helpers/process-timing.ts` for retiming
- A test fixture at `projects/_test-process/`
- A documented example at `projects/_templates/process-video.json`
- A CLAUDE.md section explaining the mode

**To make a real TikTok:**
1. Copy `projects/_templates/process-video.json` to `projects/{brand}/process-videos/{id}.json`
2. Drop a phone photo, a workflow screenshot, and the final engine output into the project
3. Edit the 5 beat text strings + `handle`
4. Run `npm run process-video -- --project {brand} --video {id}`
5. Upload `projects/{brand}/output/process-videos/{id}.mp4` to TikTok
