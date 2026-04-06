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
import type { VideoGenOptions } from '../types/index.js';

// ─── Higgsfield SDK ─────────────────────────────────────────────────────────

let configured = false;

async function configureHiggsfield() {
  if (configured) return;

  const apiKey = process.env['HF_API_KEY'];
  const apiSecret = process.env['HF_API_SECRET'];
  if (!apiKey || !apiSecret) {
    throw new Error('HF_API_KEY and HF_API_SECRET must be set in .env');
  }

  const { config } = await import('@higgsfield/client/v2');
  config({ apiKey, apiSecret });
  configured = true;
}

async function getClient() {
  await configureHiggsfield();
  const { higgsfield } = await import('@higgsfield/client/v2');
  return higgsfield;
}

async function encodeImageAsDataUri(imagePath: string): Promise<string> {
  const buffer = await fs.readFile(imagePath);
  const base64 = buffer.toString('base64');
  const ext = path.extname(imagePath).toLowerCase().slice(1);
  const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png';
  return `data:${mimeType};base64,${base64}`;
}

async function downloadVideo(url: string, destPath: string): Promise<void> {
  await fs.ensureDir(path.dirname(destPath));
  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error(`Failed to download video from Higgsfield: HTTP ${response.status}`);
  }
  const buffer = await response.arrayBuffer();
  await fs.writeFile(destPath, Buffer.from(buffer));
}

/** Map pipeline duration to Higgsfield supported durations. */
function mapDuration(seconds: number): number {
  if (seconds <= 5) return 5;
  return 10;
}

/**
 * Generate a video clip via Higgsfield.
 *
 * Uses SOUL ID for character identity lock and Cinema Studio lens context
 * from the Director plan for consistent cinematic output.
 *
 * @param prompt - Scene description with cinematography context
 * @param options - Aspect ratio, duration, project context
 * @param projectsRoot - Root folder containing all projects
 * @param imageReference - Optional storyboard image for image-to-video mode
 * @param soulId - Optional Higgsfield SOUL ID for character consistency
 * @returns Absolute path to the generated .mp4 clip
 */
export async function generateHiggsfieldClip(
  prompt: string,
  options: VideoGenOptions,
  projectsRoot: string,
  imageReference?: string,
  soulId?: string,
): Promise<string> {
  const client = await getClient();

  const { projectName, sceneIndex, ...hashableOptions } = options;

  const cacheHash = hashVideoRequest(prompt, {
    ...hashableOptions,
    imageReference: imageReference ?? null,
    provider: 'higgsfield',
    soulId: soulId ?? null,
  });

  const manifestPath = getCacheManifestPath(projectsRoot, projectName);
  const manifest = await loadCacheManifest(manifestPath);

  const cachedEntry = manifest[cacheHash];
  if (cachedEntry !== undefined) {
    if (await fs.pathExists(cachedEntry.clipPath)) {
      logger.skip(`Using cached Higgsfield clip for scene ${sceneIndex}: ${cachedEntry.clipPath}`);
      return cachedEntry.clipPath;
    }
    logger.warn(`Cache entry found for scene ${sceneIndex} but file is missing. Regenerating...`);
  }

  const outputPath = path.join(
    projectsRoot,
    projectName,
    'output/clips',
    `scene-${sceneIndex}.mp4`,
  );
  await fs.ensureDir(path.dirname(outputPath));

  const duration = mapDuration(options.duration);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const input: any = {
    prompt,
    duration: String(duration),
    aspect_ratio: options.aspectRatio,
  };

  if (soulId) {
    input.soul_id = soulId;
    logger.info(`  Scene ${sceneIndex}: using SOUL ID for character consistency`);
  }

  if (imageReference) {
    logger.step(`Submitting Higgsfield image-to-video for scene ${sceneIndex}...`);
    input.image_url = await encodeImageAsDataUri(imageReference);

    const result = await client.subscribe('/v1/image2video/dop', {
      input,
      withPolling: true,
    });

    const videoUrl = result?.video?.url;
    if (!videoUrl) {
      throw new Error(`Higgsfield i2v returned no video URL for scene ${sceneIndex}. Response: ${JSON.stringify(result)}`);
    }
    await downloadVideo(videoUrl, outputPath);
  } else {
    logger.step(`Submitting Higgsfield text-to-video for scene ${sceneIndex}...`);

    const result = await client.subscribe('/v1/text2video/dop', {
      input,
      withPolling: true,
    });

    const videoUrl = result?.video?.url;
    if (!videoUrl) {
      throw new Error(`Higgsfield t2v returned no video URL for scene ${sceneIndex}. Response: ${JSON.stringify(result)}`);
    }
    await downloadVideo(videoUrl, outputPath);
  }

  logger.success(`Higgsfield clip saved: ${outputPath}`);

  await saveCacheEntry(manifestPath, cacheHash, outputPath);
  await extractLastFrame(outputPath, sceneIndex, projectsRoot, projectName);

  return outputPath;
}
