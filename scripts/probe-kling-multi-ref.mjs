// Probe Kling for multi-image reference support.
// Uses BOGUS image URLs so nothing can accidentally get billed.
import 'dotenv/config';

const headers = {
  'hf-api-key': process.env.HF_API_KEY,
  'hf-secret': process.env.HF_API_SECRET,
  'content-type': 'application/json',
};
const base = 'https://platform.higgsfield.ai';
const BOGUS = 'https://bogus-invalid-domain-for-probing.invalid/fake.jpg';

async function probe(body, label) {
  const r = await fetch(`${base}/v1/image2video/kling`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const text = await r.text();
  console.log(`[${r.status}] ${label}`);
  console.log(`  → ${text.slice(0, 900)}`);
  console.log('');
  return { status: r.status, text };
}

// Baseline — known valid shape with bogus image
await probe({
  params: {
    model: 'kling-v2-1-master',
    prompt: 'test',
    input_image: { type: 'image_url', image_url: BOGUS },
  },
}, 'baseline (1 image)');

// Multi-image candidates
await probe({
  params: {
    model: 'kling-v2-1-master',
    prompt: 'test',
    input_image: { type: 'image_url', image_url: BOGUS },
    input_image_end: { type: 'image_url', image_url: BOGUS },
  },
}, '2 images (start + end) — known good');

// Try pluralized input_images array
await probe({
  params: {
    model: 'kling-v2-1-master',
    prompt: 'test',
    input_images: [
      { type: 'image_url', image_url: BOGUS },
      { type: 'image_url', image_url: BOGUS },
      { type: 'image_url', image_url: BOGUS },
    ],
  },
}, 'input_images array (3)');

// Elements feature
await probe({
  params: {
    model: 'kling-v2-1-master',
    prompt: 'test',
    input_image: { type: 'image_url', image_url: BOGUS },
    elements: [
      { type: 'image_url', image_url: BOGUS },
      { type: 'image_url', image_url: BOGUS },
    ],
  },
}, 'input_image + elements array');

// Reference images
await probe({
  params: {
    model: 'kling-v2-1-master',
    prompt: 'test',
    input_image: { type: 'image_url', image_url: BOGUS },
    reference_images: [
      { type: 'image_url', image_url: BOGUS },
      { type: 'image_url', image_url: BOGUS },
    ],
  },
}, 'input_image + reference_images array');

// Named slots (character/product/scene)
await probe({
  params: {
    model: 'kling-v2-1-master',
    prompt: 'test',
    input_image: { type: 'image_url', image_url: BOGUS },
    character_image: { type: 'image_url', image_url: BOGUS },
    product_image: { type: 'image_url', image_url: BOGUS },
    scene_image: { type: 'image_url', image_url: BOGUS },
  },
}, 'input_image + named slots (character/product/scene)');

// Try dedicated Kling Elements endpoint
console.log('\n═══ Alternate Kling endpoints for multi-ref ═══\n');
const altEndpoints = [
  '/v1/image2video/kling-elements',
  '/v1/image2video/kling/elements',
  '/v1/elements/kling',
  '/v1/multi-image/kling',
  '/v1/characters/kling',
];
for (const path of altEndpoints) {
  const r = await fetch(`${base}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({}),
  });
  const text = await r.text();
  const tag = r.status === 404 ? 'MISS' : r.status === 422 ? 'HIT' : `OTHER ${r.status}`;
  console.log(`[${tag}] ${path}`);
  if (r.status !== 404) console.log(`  → ${text.slice(0, 400)}\n`);
}
