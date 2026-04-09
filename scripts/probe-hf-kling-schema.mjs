// Discover the Kling schema by walking up from empty to valid.
import 'dotenv/config';

const headers = {
  'hf-api-key': process.env.HF_API_KEY,
  'hf-secret': process.env.HF_API_SECRET,
  'content-type': 'application/json',
};
const base = 'https://platform.higgsfield.ai';

async function probe(body, label) {
  const r = await fetch(`${base}/v1/image2video/kling`, {
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

// 1. Empty
await probe({ params: {} }, 'empty params');

// 2. Try common field combos
await probe({ params: { prompt: 'test' } }, 'prompt only');
await probe({ params: { prompt: 'test', model: 'kling' } }, 'model: kling');
await probe({ params: { prompt: 'test', model: 'kling-2.0' } }, 'model: kling-2.0');
await probe({ params: { prompt: 'test', model: 'kling_pro' } }, 'model: kling_pro');
await probe({ params: { prompt: 'test', model: 'kling_standard' } }, 'model: kling_standard');
await probe({ params: { prompt: 'test', model: 'kling-1.6-pro' } }, 'model: kling-1.6-pro');
await probe({ params: { prompt: 'test', model: 'kling-v1.6' } }, 'model: kling-v1.6');

// 3. If any of those found a valid model, probe for video-ref field next.
