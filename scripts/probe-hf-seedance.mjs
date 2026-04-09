// Probe Higgsfield API for Seedance endpoint(s).
// 404 = wrong path, 422 = right path with bad body (gives schema in error detail).
import 'dotenv/config';

const apiKey = process.env.HF_API_KEY;
const apiSecret = process.env.HF_API_SECRET;
const base = 'https://platform.higgsfield.ai';
const headers = {
  'hf-api-key': apiKey,
  'hf-secret': apiSecret,
  'content-type': 'application/json',
};

const candidates = [
  '/v1/image2video/seedance',
  '/v1/image2video/seedance-2.0',
  '/v1/image2video/seedance-2',
  '/v1/image2video/seedance2',
  '/v1/image2video/seedance-pro',
  '/v1/image2video/seedance/2.0',
  '/v1/image2video/bytedance',
  '/v1/seedance/image2video',
  '/v1/image2video',
  '/v1/text2video/seedance',
];

for (const path of candidates) {
  try {
    const r = await fetch(`${base}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({}),
    });
    const text = await r.text();
    const tag = r.status === 404 ? 'MISS' : r.status === 422 ? 'HIT (validation)' : `OTHER ${r.status}`;
    console.log(`[${tag}] ${path}`);
    if (r.status !== 404) {
      console.log(`  → ${text.slice(0, 800)}`);
      console.log('');
    }
  } catch (e) {
    console.log(`[ERR] ${path}: ${e.message}`);
  }
}

// Schema probe — start with empty params and walk up.
console.log('\n=== Schema probe ===');
async function probeBody(body, label) {
  const r = await fetch(`${base}/v1/image2video/seedance`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const text = await r.text();
  console.log(`[${r.status}] ${label}`);
  console.log(`  → ${text.slice(0, 1200)}`);
  console.log('');
  return { status: r.status, text };
}

await probeBody({ params: {} }, 'empty params');
await probeBody({ params: { prompt: 'test' } }, 'prompt only');
await probeBody({ params: { prompt: 'test', model: 'seedance-pro' } }, 'prompt + model:seedance-pro');
await probeBody({ params: { prompt: 'test', model: 'seedance-1.0-pro' } }, 'prompt + model:seedance-1.0-pro');
await probeBody({ params: { prompt: 'test', model: 'seedance-2.0-pro' } }, 'prompt + model:seedance-2.0-pro');
await probeBody({ params: { prompt: 'test', model: 'seedance-1.0-lite' } }, 'prompt + model:seedance-1.0-lite');

console.log('\n=== Now using correct model id ===');
await probeBody({ params: { prompt: 'test', model: 'seedance_pro' } }, 'minimal seedance_pro');
await probeBody({
  params: {
    prompt: 'test',
    model: 'seedance_pro',
    input_image: 'https://example.com/x.jpg',
  },
}, 'with string input_image');
await probeBody({
  params: {
    prompt: 'test',
    model: 'seedance_pro',
    input_image: { type: 'image_url', image_url: 'https://example.com/x.jpg' },
  },
}, 'with object input_image (bogus URL)');

// Use a real uploaded URL — upload scene-1.jpg first
import fs from 'fs';
const presign = await fetch(`${base}/files/generate-upload-url`, {
  method: 'POST',
  headers,
  body: JSON.stringify({ content_type: 'image/jpeg' }),
}).then((r) => r.json());
await fetch(presign.upload_url, {
  method: 'PUT',
  headers: { 'content-type': 'image/jpeg' },
  body: fs.readFileSync('projects/jeans-tryon-video/storyboard/scene-1.jpg'),
});
console.log('uploaded:', presign.public_url);

await probeBody({
  params: {
    prompt: 'A woman in a bedroom, subtle natural motion.',
    model: 'seedance_pro',
    input_image: { type: 'image_url', image_url: presign.public_url },
  },
}, 'with REAL uploaded image_url');

await probeBody({
  params: {
    prompt: 'A woman in a bedroom, subtle natural motion.',
    model: 'seedance_pro',
    input_image: { type: 'image_url', image_url: presign.public_url },
    duration: '5',
    aspect_ratio: '9:16',
  },
}, 'with duration + aspect_ratio');

await probeBody({
  params: {
    prompt: 'A woman in a bedroom, subtle natural motion.',
    model: 'seedance_pro',
    input_image: { type: 'image_url', image_url: presign.public_url },
    duration: '10',
    aspect_ratio: '9:16',
  },
}, 'with duration:10');
