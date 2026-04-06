/**
 * Generate scroll animation videos for the Mira landing page.
 *
 * 1. Kling v3 i2v: Nike 1 (landscape) → Nike 3 (square) — 5s hero video
 * 2. Veo 3.1 i2v: Nike 3 (square) → Nike 5 (story) — 6s portfolio video
 *
 * Then extract frames with ffmpeg for canvas scroll animation.
 *
 * Usage: npx tsx scripts/generate-scroll-videos.ts
 */

import 'dotenv/config';
import path from 'path';
import fs from 'fs-extra';
import { generateFalClip } from '../src/pipeline/fal.js';
import { generateVeoClip } from '../src/pipeline/veo.js';
import type { VideoGenOptions } from '../src/types/index.js';
import { execSync } from 'child_process';

const ROOT = path.resolve(import.meta.dirname, '..');
const PORTFOLIO_DIR = path.join(ROOT, 'web/public/portfolio');
const FRAMES_DIR = path.join(ROOT, 'web/public/frames');
const TEMP_PROJECT = 'website-scroll';

async function main() {
  console.log('=== Mira Landing Page — Scroll Video Generation ===\n');

  // Create temp project dirs for pipeline cache
  const projectRoot = path.join(ROOT, 'projects');
  await fs.ensureDir(path.join(projectRoot, TEMP_PROJECT, 'output/clips'));
  await fs.ensureDir(path.join(projectRoot, TEMP_PROJECT, 'cache'));

  // Source images
  const nike1 = path.join(PORTFOLIO_DIR, 'nike-1-landscape.jpg');
  const nike3 = path.join(PORTFOLIO_DIR, 'nike-3-square.jpg');
  const nike5 = path.join(PORTFOLIO_DIR, 'nike-5-story.jpg');

  // ── Step 1: Kling v3 Hero Video ──────────────────────────────────────────
  console.log('\n[1/2] Kling v3 Pro — Hero scroll video');
  console.log('  Start: nike-1-landscape.jpg (dramatic underpass)');
  console.log('  End:   nike-3-square.jpg (product splash)');
  console.log('  Duration: 5s | Cost: ~£0.90\n');

  const heroOptions: VideoGenOptions = {
    aspectRatio: '16:9',
    duration: 5,
    projectName: TEMP_PROJECT,
    sceneIndex: 1,
  };

  const heroPrompt = 'Smooth cinematic camera push forward through a moody urban underpass at dawn, golden light intensifying, revealing a Nike running shoe in dynamic splash motion. Dramatic volumetric lighting, slow-motion water droplets, professional product photography look.';

  const heroClipPath = await generateFalClip(
    heroPrompt,
    heroOptions,
    projectRoot,
    nike1,    // start image
    nike3,    // end image (tail frame for continuity)
    'v3',
  );
  console.log(`  ✅ Hero clip: ${heroClipPath}\n`);

  // ── Step 2: Veo 3.1 Portfolio Video ───────────────────────────────────────
  console.log('[2/2] Veo 3.1 — Portfolio scroll video');
  console.log('  Start: nike-3-square.jpg (product splash)');
  console.log('  Duration: 6s | Cost: ~£3.60-5.20\n');

  const portfolioOptions: VideoGenOptions = {
    aspectRatio: '16:9',
    duration: 6,
    projectName: TEMP_PROJECT,
    sceneIndex: 2,
  };

  const portfolioPrompt = 'Cinematic slow-motion transition from dramatic product shot to golden hour outdoor running scene. Nike shoe gleams in warm amber light as camera pulls back to reveal an epic sunrise landscape. Volumetric golden rays, lens flares, premium commercial feel.';

  const portfolioClipPath = await generateVeoClip(
    portfolioPrompt,
    portfolioOptions,
    projectRoot,
    nike3,    // start image
    'veo-3.1',
  );
  console.log(`  ✅ Portfolio clip: ${portfolioClipPath}\n`);

  // ── Step 3: Extract frames ───────────────────────────────────────────────
  console.log('[3/3] Extracting frames with ffmpeg...\n');

  // Clean existing placeholder frames
  await fs.emptyDir(path.join(FRAMES_DIR, 'hero'));
  await fs.emptyDir(path.join(FRAMES_DIR, 'portfolio'));

  // Hero: 24fps → ~120 frames from 5s video
  console.log('  Extracting hero frames (24fps, 1920w, JPEG)...');
  execSync(
    `ffmpeg -i "${heroClipPath}" -vf "fps=24,scale=1920:-1" -q:v 3 "${path.join(FRAMES_DIR, 'hero/frame-%04d.jpg')}" -y`,
    { stdio: 'inherit' },
  );

  // Portfolio: 24fps → ~144 frames from 6s video
  console.log('  Extracting portfolio frames (24fps, 1920w, JPEG)...');
  execSync(
    `ffmpeg -i "${portfolioClipPath}" -vf "fps=24,scale=1920:-1" -q:v 3 "${path.join(FRAMES_DIR, 'portfolio/frame-%04d.jpg')}" -y`,
    { stdio: 'inherit' },
  );

  // Count frames
  const heroFrames = (await fs.readdir(path.join(FRAMES_DIR, 'hero'))).filter(f => f.endsWith('.jpg')).length;
  const portfolioFrames = (await fs.readdir(path.join(FRAMES_DIR, 'portfolio'))).filter(f => f.endsWith('.jpg')).length;

  console.log(`\n=== Done ===`);
  console.log(`  Hero frames: ${heroFrames} (in web/public/frames/hero/)`);
  console.log(`  Portfolio frames: ${portfolioFrames} (in web/public/frames/portfolio/)`);
  console.log(`\n  Update ScrollFrameCanvas frameCount props:`);
  console.log(`    Hero: frameCount={${heroFrames}}`);
  console.log(`    Portfolio: frameCount={${portfolioFrames}}`);
}

main().catch((err) => {
  console.error('❌ Failed:', err.message);
  process.exit(1);
});
