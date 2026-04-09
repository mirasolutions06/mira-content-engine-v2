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

// ─── Seedance via Higgsfield ────────────────────────────────────────────────
//
// Endpoint: /v1/image2video/seedance
// Auth:     same hf-api-key + hf-secret headers as DoP
// Body:     { params: { ... } }   ← same envelope as DoP
// Polling:  /v1/job-sets/{id}     ← same poll path as DoP
// Image:    uploaded via /files/generate-upload-url then referenced as a public URL
// Models:   'seedance_pro' (best quality) | 'seedance_lite'
// Duration: integer 3-12 seconds (NOT a string like DoP)
// Default:  camera_fixed=true, enhance_prompt=true, aspect_ratio='auto'
//
// Discovered via scripts/probe-hf-seedance.mjs.

const SEEDANCE_ENDPOINT = '/v1/image2video/seedance';
const SEEDANCE_MODEL = 'seedance_pro';

async function downloadVideo(url: string, destPath: string): Promise<void> {
  await fs.ensureDir(path.dirname(destPath));
  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error(`Failed to download video from Seedance: HTTP ${response.status}`);
  }
  const buffer = await response.arrayBuffer();
  await fs.writeFile(destPath, Buffer.from(buffer));
}

/** Clamp the requested duration to Seedance's allowed integer range (3-12). */
function mapSeedanceDuration(seconds: number): number {
  const rounded = Math.round(seconds);
  if (rounded < 3) return 3;
  if (rounded > 12) return 12;
  return rounded;
}

/**
 * Generate a video clip via Seedance 1.0 Pro on Higgsfield.
 *
 * Image-to-video only — Seedance on HF requires `input_image`. The pipeline always
 * provides a starting frame for video clips so this is always satisfied.
 *
 * Reuses helpers from higgsfield.ts (auth, image upload, REST submit + custom polling)
 * because Seedance lives on the same Higgsfield platform with the same envelope shape.
 *
 * @param prompt - Scene description (Seedance auto-enhances internally)
 * @param options - Aspect ratio, duration, project context
 * @param projectsRoot - Root folder containing all projects
 * @param imageReference - Required storyboard image path (image-to-video)
 * @returns Absolute path to the generated .mp4 clip
 */
export async function generateSeedanceClip(
  prompt: string,
  options: VideoGenOptions,
  projectsRoot: string,
  imageReference?: string,
): Promise<string> {
  const { projectName, sceneIndex, ...hashableOptions } = options;

  const cacheHash = hashVideoRequest(prompt, {
    ...hashableOptions,
    imageReference: imageReference ?? null,
    provider: 'seedance',
    model: SEEDANCE_MODEL,
  });

  const manifestPath = getCacheManifestPath(projectsRoot, projectName);
  const manifest = await loadCacheManifest(manifestPath);

  const cachedEntry = manifest[cacheHash];
  if (cachedEntry !== undefined) {
    if (await fs.pathExists(cachedEntry.clipPath)) {
      logger.skip(`Using cached Seedance clip for scene ${sceneIndex}: ${cachedEntry.clipPath}`);
      return cachedEntry.clipPath;
    }
    logger.warn(`Cache entry found for scene ${sceneIndex} but file is missing. Regenerating...`);
  }

  if (!imageReference) {
    throw new Error(
      `Seedance requires an image reference for scene ${sceneIndex}. ` +
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

  logger.step(`Submitting Seedance image-to-video for scene ${sceneIndex}...`);
  logger.info(`  Scene ${sceneIndex}: uploading reference image to Higgsfield CDN...`);
  const publicUrl = await uploadImageToHiggsfield(imageReference);

  const duration = mapSeedanceDuration(options.duration);

  // Schema verified via probe (scripts/probe-hf-seedance.mjs):
  //   model:           'seedance_pro' | 'seedance_lite'
  //   prompt:          string
  //   input_image:     { type: 'image_url', image_url: <public_url> }   ← singular!
  //   duration:        integer 3-12 (not a string)
  //   aspect_ratio:    'auto' | '9:16' | '16:9' | '1:1' | ... (defaults to 'auto' = match input image)
  //   camera_fixed:    boolean (default true — locked-off camera)
  //   enhance_prompt:  boolean (default true — Seedance rewrites internally)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const params: any = {
    model: SEEDANCE_MODEL,
    prompt,
    input_image: { type: 'image_url', image_url: publicUrl },
    duration,
    aspect_ratio: options.aspectRatio,
    camera_fixed: true,
    enhance_prompt: true,
  };

  logger.info(`  Scene ${sceneIndex}: model=${SEEDANCE_MODEL}, duration=${duration}s, camera_fixed=true`);

  const videoUrl = await submitAndPollHiggsfield(SEEDANCE_ENDPOINT, { params }, sceneIndex);
  await downloadVideo(videoUrl, outputPath);

  logger.success(`Seedance clip saved: ${outputPath}`);

  await saveCacheEntry(manifestPath, cacheHash, outputPath);
  await extractLastFrame(outputPath, sceneIndex, projectsRoot, projectName);

  return outputPath;
}
