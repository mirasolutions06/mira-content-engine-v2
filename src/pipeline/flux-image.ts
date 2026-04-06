import path from 'path';
import fs from 'fs-extra';
import { logger } from '../utils/logger.js';
import type { StoryboardGenOptions, ImageFormat, BrandContext } from '../types/index.js';

// ─── Higgsfield SDK (Flux 2 Pro via Higgsfield platform) ────────────────────

let configured = false;

async function configureHiggsfield() {
  if (configured) return;

  const apiKey = process.env['HF_API_KEY'];
  const apiSecret = process.env['HF_API_SECRET'];
  if (!apiKey || !apiSecret) {
    throw new Error('HF_API_KEY and HF_API_SECRET must be set in .env for Flux 2');
  }

  const { config } = await import('@higgsfield/client/v2');
  config({ apiKey, apiSecret });
  configured = true;
}

async function encodeImageAsBase64(imagePath: string): Promise<string> {
  const buffer = await fs.readFile(imagePath);
  return buffer.toString('base64');
}

async function downloadImage(url: string, destPath: string): Promise<void> {
  await fs.ensureDir(path.dirname(destPath));
  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error(`Failed to download image from Flux 2: HTTP ${response.status}`);
  }
  const buffer = await response.arrayBuffer();
  await fs.writeFile(destPath, Buffer.from(buffer));
}

/** Map ImageFormat to Flux 2 aspect ratio string. */
function mapAspectRatio(format: ImageFormat | string): string {
  switch (format) {
    case 'story': return 'portrait_9_16';
    case 'square': return 'square_1_1';
    case 'landscape': return 'landscape_16_9';
    default: return 'square_1_1';
  }
}

/**
 * Generate a storyboard frame via Flux 2 Pro (through Higgsfield).
 * Used by the image-router for video mode storyboard generation.
 */
export async function generateFluxStoryboardFrame(
  options: StoryboardGenOptions,
): Promise<string | null> {
  await configureHiggsfield();

  const { sceneIndex, prompt, projectsRoot, projectName } = options;
  const outputDir = path.join(projectsRoot, projectName, 'assets', 'storyboard');
  await fs.ensureDir(outputDir);
  const outputPath = path.join(outputDir, `scene-${sceneIndex}.jpg`);

  // Idempotent: skip if already exists
  if (await fs.pathExists(outputPath)) {
    logger.skip(`Flux 2 frame exists: scene-${sceneIndex}`);
    return outputPath;
  }

  try {
    const { higgsfield } = await import('@higgsfield/client/v2');

    // Build the full prompt with photography context
    const parts = [prompt];
    if (options.lightingSetup) parts.push(`Lighting: ${options.lightingSetup}`);
    if (options.backgroundDescription) parts.push(`Background: ${options.backgroundDescription}`);
    if (options.colorPalette) parts.push(`Colors: ${options.colorPalette}`);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const input: any = {
      prompt: parts.join('. '),
      aspect_ratio: mapAspectRatio(options.format ?? 'square'),
      num_inference_steps: 28,
      safety_tolerance: 4,
    };

    // Add subject reference if available (Flux 2 supports up to 8 refs)
    if (options.subjectReferencePath && (await fs.pathExists(options.subjectReferencePath))) {
      input.input_image = await encodeImageAsBase64(options.subjectReferencePath);
      logger.info(`  Scene ${sceneIndex}: using subject ref for Flux 2`);
    }

    // Add scene 1 anchor as second ref for style consistency
    if (options.scene1AnchorPath && (await fs.pathExists(options.scene1AnchorPath))) {
      input.input_image_2 = await encodeImageAsBase64(options.scene1AnchorPath);
      logger.info(`  Scene ${sceneIndex}: using scene 1 anchor for style consistency`);
    }

    logger.step(`Submitting Flux 2 Pro for scene ${sceneIndex}...`);

    const result = await higgsfield.subscribe('flux-pro/kontext/max/text-to-image', {
      input,
      withPolling: true,
    });

    const imageUrl = result?.images?.[0]?.url;
    if (!imageUrl) {
      throw new Error(`Flux 2 returned no image URL for scene ${sceneIndex}. Response: ${JSON.stringify(result)}`);
    }

    await downloadImage(imageUrl, outputPath);
    logger.success(`Flux 2 frame saved: scene-${sceneIndex}`);
    return outputPath;
  } catch (err) {
    logger.warn(`Flux 2 generation failed for scene ${sceneIndex}: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

/**
 * Generate a brand image via Flux 2 Pro (through Higgsfield).
 * Used by brand-images.ts for the brand-images pipeline mode.
 *
 * @param sceneIndex - 1-based scene number
 * @param prompt - Photography-grade prompt
 * @param brand - Brand name
 * @param brief - Brand brief/context
 * @param format - Image format (story/square/landscape)
 * @param outputPath - Where to save the image
 * @param referenceImagePaths - Filtered refs for this scene (max 8 for Flux 2)
 * @param brandContext - Director brand context (optional)
 * @param scene1AnchorPath - First scene output for style consistency
 * @param products - Product descriptions
 */
export async function generateFluxBrandImage(
  sceneIndex: number,
  prompt: string,
  brand: string,
  brief: string | undefined,
  format: ImageFormat,
  outputPath: string,
  referenceImagePaths: string[],
  brandContext: BrandContext | undefined,
  scene1AnchorPath?: string,
  products?: string[],
): Promise<string | null> {
  await configureHiggsfield();

  // Idempotent
  if (await fs.pathExists(outputPath)) {
    logger.skip(`Flux 2 image exists: ${path.basename(outputPath)}`);
    return outputPath;
  }

  try {
    const { higgsfield } = await import('@higgsfield/client/v2');

    // Build enriched prompt
    const parts = [prompt];
    if (brief) parts.push(brief);
    if (brandContext?.lightingSetup) parts.push(`Lighting: ${brandContext.lightingSetup}`);
    if (brandContext?.backgroundDescription) parts.push(`Background: ${brandContext.backgroundDescription}`);
    if (brandContext?.colorPalette) parts.push(`Colors: ${brandContext.colorPalette}`);
    if (products && products.length > 0) {
      parts.push(`Products in frame: ${products.join(', ')}`);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const input: any = {
      prompt: parts.join('. '),
      aspect_ratio: mapAspectRatio(format),
      num_inference_steps: 28,
      safety_tolerance: 4,
    };

    // Add reference images (Flux 2 supports up to 8)
    // Scene 1 anchor gets slot 1 (most important for consistency)
    let refSlot = 1;
    if (scene1AnchorPath && sceneIndex > 1 && (await fs.pathExists(scene1AnchorPath))) {
      input[`input_image`] = await encodeImageAsBase64(scene1AnchorPath);
      refSlot = 2;
      logger.info(`  Scene ${sceneIndex}: Flux 2 ref 1 = scene 1 anchor`);
    }

    // Add filtered refs (smart ref filtering already applied by caller)
    const maxRefs = 8;
    for (const refPath of referenceImagePaths) {
      if (refSlot > maxRefs) break;
      if (!(await fs.pathExists(refPath))) continue;
      const key = refSlot === 1 ? 'input_image' : `input_image_${refSlot}`;
      input[key] = await encodeImageAsBase64(refPath);
      logger.info(`  Scene ${sceneIndex}: Flux 2 ref ${refSlot} = ${path.basename(refPath)}`);
      refSlot++;
    }

    logger.step(`Submitting Flux 2 Pro for ${path.basename(outputPath)}...`);

    const result = await higgsfield.subscribe('flux-pro/kontext/max/text-to-image', {
      input,
      withPolling: true,
    });

    const imageUrl = result?.images?.[0]?.url;
    if (!imageUrl) {
      throw new Error(`Flux 2 returned no image for ${path.basename(outputPath)}. Response: ${JSON.stringify(result)}`);
    }

    await fs.ensureDir(path.dirname(outputPath));
    await downloadImage(imageUrl, outputPath);
    logger.success(`Flux 2 image saved: ${path.basename(outputPath)}`);
    return outputPath;
  } catch (err) {
    logger.warn(`Flux 2 generation failed for ${path.basename(outputPath)}: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}
