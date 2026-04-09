import path from 'path';
import fs from 'fs-extra';
import { logger } from '../utils/logger.js';
import {
  hashVideoRequest,
  getCacheManifestPath,
  loadCacheManifest,
  saveCacheEntry,
} from '../utils/cache.js';
import { extractLastFrame } from './frames.js';
import {
  uploadImageToHiggsfield,
  submitAndPollHiggsfield,
} from './higgsfield.js';
import type { VideoGenOptions } from '../types/index.js';

// ─── Kling 2.1 master via Higgsfield ────────────────────────────────────────
//
// Endpoint: /v1/image2video/kling
// Auth:     same hf-api-key + hf-secret headers as DoP/Seedance
// Body:     { params: { ... } }
// Polling:  /v1/job-sets/{id}
// Image:    uploaded via /files/generate-upload-url (same flow as Seedance)
// Models:   'kling-v2-1-master' (best) | 'kling-v2-1' (standard)
// Duration: integer 5 or 10 (literal enum, NOT a range)
// Optional: negative_prompt, cfg_scale, motion_id (UUID from /v1/motions),
//           input_image_end (start/end frame interpolation), enhance_prompt, mode
//
// IMPORTANT: Kling silently ignores unknown fields (unlike DoP/Seedance which 500).
// Don't send fields not in this list or you risk unexpected behavior.
//
// Kling has NO camera_fixed flag — camera behavior must be controlled via prompt
// and/or negative_prompt. To prevent dancing / camera moves, use:
//   negative_prompt: "dancing, camera movement, zoom, pan, shake, tilt, crane, moving camera"
//
// Discovered via scripts/probe-hf-kling-schema.mjs + scripts/probe-kling-schema-full.mjs.

const KLING_ENDPOINT = '/v1/image2video/kling';

/**
 * Default Kling model for single-frame image-to-video (highest quality tier).
 */
const KLING_MODEL_DEFAULT = 'kling-v2-1-master';

/**
 * Model used when keyframe interpolation is requested (input_image_end is set).
 *
 * CRITICAL: `kling-v2-1-master` silently accepts `input_image_end` in the request
 * body (the API echoes it back in input_params) but the model then fails at ~16s
 * with status `failed` and no error payload. The `kling-v2-1` (standard) variant
 * DOES honor keyframe interpolation and produces smooth start→end transitions.
 *
 * Verified via scripts/probe-kling-keyframe.mjs — kling-v2-1 completed a
 * front→three-quarter-rear turn interpolation cleanly in ~80s.
 */
const KLING_MODEL_KEYFRAMES = 'kling-v2-1';

async function downloadVideo(url: string, destPath: string): Promise<void> {
  await fs.ensureDir(path.dirname(destPath));
  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error(`Failed to download video from Kling: HTTP ${response.status}`);
  }
  const buffer = await response.arrayBuffer();
  await fs.writeFile(destPath, Buffer.from(buffer));
}

/** Clamp requested duration to Kling's allowed enum (5 or 10). */
function mapKlingDuration(seconds: number): 5 | 10 {
  return seconds > 5 ? 10 : 5;
}

/**
 * Generate a video clip via Kling 2.1 master on Higgsfield.
 *
 * Image-to-video only — Kling requires `input_image`. The pipeline always provides a
 * starting frame for video clips so this is always satisfied.
 *
 * Reuses helpers from higgsfield.ts (auth, image upload, REST submit + polling).
 *
 * @param prompt - Scene description (Kling auto-enhances via enhance_prompt: true)
 * @param options - Aspect ratio, duration, project context
 * @param projectsRoot - Root folder containing all projects
 * @param imageReference - Required storyboard image path
 * @returns Absolute path to the generated .mp4 clip
 */
export async function generateKlingClip(
  prompt: string,
  options: VideoGenOptions,
  projectsRoot: string,
  imageReference?: string,
): Promise<string> {
  const { projectName, sceneIndex, ...hashableOptions } = options;

  // Switch model based on whether keyframes are requested — master variant does NOT
  // support input_image_end; standard variant does.
  const klingModel = options.imageReferenceEnd ? KLING_MODEL_KEYFRAMES : KLING_MODEL_DEFAULT;

  const cacheHash = hashVideoRequest(prompt, {
    ...hashableOptions,
    imageReference: imageReference ?? null,
    provider: 'kling',
    model: klingModel,
  });

  const manifestPath = getCacheManifestPath(projectsRoot, projectName);
  const manifest = await loadCacheManifest(manifestPath);

  const cachedEntry = manifest[cacheHash];
  if (cachedEntry !== undefined) {
    if (await fs.pathExists(cachedEntry.clipPath)) {
      logger.skip(`Using cached Kling clip for scene ${sceneIndex}: ${cachedEntry.clipPath}`);
      return cachedEntry.clipPath;
    }
    logger.warn(`Cache entry found for scene ${sceneIndex} but file is missing. Regenerating...`);
  }

  if (!imageReference) {
    throw new Error(
      `Kling requires an image reference for scene ${sceneIndex}. ` +
        `Set imageReference on the clip or rely on storyboard generation.`,
    );
  }

  const outputPath = path.join(
    projectsRoot,
    projectName,
    'output/clips',
    `scene-${sceneIndex}.mp4`,
  );
  await fs.ensureDir(path.dirname(outputPath));

  logger.step(`Submitting Kling image-to-video for scene ${sceneIndex}...`);
  logger.info(`  Scene ${sceneIndex}: uploading start frame to Higgsfield CDN...`);
  const publicUrl = await uploadImageToHiggsfield(imageReference);

  // Optional end frame for keyframe interpolation (Kling's standout feature)
  let publicUrlEnd: string | null = null;
  if (options.imageReferenceEnd) {
    logger.info(`  Scene ${sceneIndex}: uploading END frame for keyframe interpolation...`);
    publicUrlEnd = await uploadImageToHiggsfield(options.imageReferenceEnd);
  }

  const duration = mapKlingDuration(options.duration);

  // Default negative prompt to prevent the "Kling dance" problem — Kling has a strong
  // bias toward adding dance-like gestures and camera movement when given a person image.
  // This negative prompt holds the camera still and keeps motion subtle.
  const DEFAULT_NEGATIVE = 'dancing, choreography, jumping, twirling, camera movement, zoom, pan, tilt, shake, crane, dolly, moving camera, rotating camera, orbit, fast motion, exaggerated gestures, fashion pose performance';

  // Schema verified via probe (scripts/probe-kling-schema-full.mjs):
  //   model:            'kling-v2-1' | 'kling-v2-1-master'
  //   prompt:           string
  //   input_image:      { type: 'image_url', image_url: <public_url> }   ← singular
  //   duration:         literal 5 or 10 (integer, not string)
  //   enhance_prompt:   boolean (default true)
  //   mode:             string (default 'pro')
  //   cfg_scale:        number 0-1 (default 0.5, prompt adherence)
  //   motion_id:        UUID from /v1/motions (optional, accepts DoP motion preset IDs)
  //   negative_prompt:  string (default '')
  //   input_image_end:  optional start/end frame interpolation
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const params: any = {
    model: klingModel,
    prompt,
    input_image: { type: 'image_url', image_url: publicUrl },
    duration,
    cfg_scale: 0.5,
    enhance_prompt: true,
  };

  // Negative prompt is ONLY applied in single-frame mode.
  // In keyframe-interpolation mode (input_image_end set), the motion is driven by the
  // start→end transition, and the anti-dance/anti-camera-motion negative prompt can
  // conflict with the natural body rotation needed to interpolate between frames.
  if (publicUrlEnd) {
    params.input_image_end = { type: 'image_url', image_url: publicUrlEnd };
  } else {
    params.negative_prompt = DEFAULT_NEGATIVE;
  }

  logger.info(
    `  Scene ${sceneIndex}: model=${klingModel}, duration=${duration}s` +
      (publicUrlEnd ? `, KEYFRAME INTERPOLATION (start → end), no neg_prompt` : `, neg_prompt set`),
  );

  const videoUrl = await submitAndPollHiggsfield(KLING_ENDPOINT, { params }, sceneIndex);
  await downloadVideo(videoUrl, outputPath);

  logger.success(`Kling clip saved: ${outputPath}`);

  await saveCacheEntry(manifestPath, cacheHash, outputPath);
  await extractLastFrame(outputPath, sceneIndex, projectsRoot, projectName);

  return outputPath;
}
