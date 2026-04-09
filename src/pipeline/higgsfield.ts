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

export function getHfHeaders(): Record<string, string> {
  const apiKey = process.env['HF_API_KEY'];
  const apiSecret = process.env['HF_API_SECRET'];
  if (!apiKey || !apiSecret) {
    throw new Error('HF_API_KEY and HF_API_SECRET must be set in .env');
  }
  return {
    'hf-api-key': apiKey,
    'hf-secret': apiSecret,
    'content-type': 'application/json',
  };
}

export const HF_BASE = 'https://platform.higgsfield.ai';

/**
 * Submits a Higgsfield image2video / text2video request and polls until completion.
 * Replaces the SDK's subscribe() because:
 *   - The bundled SDK posts the body unwrapped, but the API now requires `{ params: ... }`.
 *   - The API response uses `id`, but the SDK polls only when `request_id` is present.
 * We POST + poll directly here to bypass both issues.
 *
 * @returns The CDN URL of the generated mp4 (raw quality).
 */
export async function submitAndPollHiggsfield(
  endpoint: string,
  body: Record<string, unknown>,
  sceneIndex: number,
): Promise<string> {
  const headers = getHfHeaders();
  const submitRes = await fetch(`${HF_BASE}${endpoint}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!submitRes.ok) {
    const errBody = await submitRes.text();
    throw new Error(`Higgsfield submit failed (${submitRes.status}) for scene ${sceneIndex}: ${errBody.slice(0, 600)}`);
  }
  const submitJson = (await submitRes.json()) as { id: string };
  const jobSetId = submitJson.id;
  if (!jobSetId) {
    throw new Error(`Higgsfield submit returned no id for scene ${sceneIndex}: ${JSON.stringify(submitJson).slice(0, 500)}`);
  }

  // Poll the job set until status is completed or failed.
  // Higgsfield i2v jobs typically take 30s-2min for DoP/Seedance 5-10s clips,
  // but Kling 2.1 master 10s can take 6-8 minutes — hence the 12 minute ceiling.
  const pollUrl = `${HF_BASE}/v1/job-sets/${jobSetId}`;
  const pollIntervalMs = 4000;
  const maxAttempts = 180; // 12 minutes
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    const pollRes = await fetch(pollUrl, { headers });
    if (!pollRes.ok) {
      // Transient errors → retry
      if (pollRes.status >= 500) continue;
      throw new Error(`Higgsfield poll failed (${pollRes.status}) for scene ${sceneIndex}: ${(await pollRes.text()).slice(0, 400)}`);
    }
    const jobSet = (await pollRes.json()) as {
      jobs: Array<{
        status: 'queued' | 'in_progress' | 'completed' | 'failed' | 'nsfw';
        results: { raw?: { url: string }; min?: { url: string } } | null;
      }>;
    };
    const job = jobSet.jobs?.[0];
    if (!job) continue;
    if (job.status === 'failed' || job.status === 'nsfw') {
      // Capture full payload for post-mortem debugging
      const fullPayload = JSON.stringify(jobSet).slice(0, 800);
      throw new Error(
        `Higgsfield job ${jobSetId} for scene ${sceneIndex} ended with status ${job.status}. ` +
          `Full payload: ${fullPayload}`,
      );
    }
    if (job.status === 'completed') {
      const url = job.results?.raw?.url ?? job.results?.min?.url;
      if (!url) {
        throw new Error(`Higgsfield completed job ${jobSetId} but returned no video URL: ${JSON.stringify(job).slice(0, 400)}`);
      }
      return url;
    }
    // Still queued/in_progress — keep polling
    if (attempt > 0 && attempt % 10 === 0) {
      logger.info(`  Scene ${sceneIndex}: still ${job.status} (${attempt * pollIntervalMs / 1000}s elapsed)...`);
    }
  }
  throw new Error(`Higgsfield job ${jobSetId} for scene ${sceneIndex} did not complete within ${maxAttempts * pollIntervalMs / 1000}s`);
}

/**
 * Uploads a local image to Higgsfield's CDN and returns the public URL.
 * Uses /files/generate-upload-url to get a presigned PUT, then uploads the bytes.
 * Required because /v1/image2video/dop rejects data URIs (2083 char limit on image_url).
 */
export async function uploadImageToHiggsfield(imagePath: string): Promise<string> {
  const ext = path.extname(imagePath).toLowerCase().slice(1);
  const contentType = ext === 'png' ? 'image/png' : 'image/jpeg';

  // Step 1: get presigned upload URL
  const presignRes = await fetch(`${HF_BASE}/files/generate-upload-url`, {
    method: 'POST',
    headers: getHfHeaders(),
    body: JSON.stringify({ content_type: contentType }),
  });
  if (!presignRes.ok) {
    throw new Error(`Higgsfield presign failed: ${presignRes.status} ${await presignRes.text()}`);
  }
  const { upload_url, public_url } = (await presignRes.json()) as { upload_url: string; public_url: string };

  // Step 2: PUT the image bytes
  const buffer = await fs.readFile(imagePath);
  const putRes = await fetch(upload_url, {
    method: 'PUT',
    headers: { 'content-type': contentType },
    body: buffer,
  });
  if (!putRes.ok) {
    throw new Error(`Higgsfield image upload failed: ${putRes.status} ${await putRes.text()}`);
  }

  return public_url;
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
    motions: options.motions ?? null,
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

  // Build params block matching the documented DoPImage2VideoInput schema.
  // The Higgsfield API now requires the body wrapped in `{ params: ... }`.
  // Allowed model values: 'dop-lite' | 'dop-preview' | 'dop-turbo' (verified via 422 response).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const params: any = {
    model: 'dop-turbo',
    prompt,
    duration: String(duration),
    aspect_ratio: options.aspectRatio,
    enhance_prompt: true,
  };

  if (soulId) {
    params.soul_id = soulId;
    logger.info(`  Scene ${sceneIndex}: using SOUL ID for character consistency`);
  }

  if (options.motions && options.motions.length > 0) {
    params.motions = options.motions;
    const ids = options.motions.map((m) => `${m.id.slice(0, 8)}@${m.strength}`).join(', ');
    logger.info(`  Scene ${sceneIndex}: using motion(s) ${ids}`);
  }

  if (imageReference) {
    logger.step(`Submitting Higgsfield image-to-video for scene ${sceneIndex}...`);
    logger.info(`  Scene ${sceneIndex}: uploading reference image to Higgsfield CDN...`);
    const publicUrl = await uploadImageToHiggsfield(imageReference);
    params.input_images = [{ type: 'image_url', image_url: publicUrl }];

    const videoUrl = await submitAndPollHiggsfield('/v1/image2video/dop', { params }, sceneIndex);
    await downloadVideo(videoUrl, outputPath);
  } else {
    logger.step(`Submitting Higgsfield text-to-video for scene ${sceneIndex}...`);
    const videoUrl = await submitAndPollHiggsfield('/v1/text2video/dop', { params }, sceneIndex);
    await downloadVideo(videoUrl, outputPath);
  }
  // suppress unused-warning for legacy SDK client (kept for credentials side-effects)
  void client;

  logger.success(`Higgsfield clip saved: ${outputPath}`);

  await saveCacheEntry(manifestPath, cacheHash, outputPath);
  await extractLastFrame(outputPath, sceneIndex, projectsRoot, projectName);

  return outputPath;
}
