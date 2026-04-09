// Probe Higgsfield for:
//   1. Kling endpoint (any variant)
//   2. Seedance additional fields (video ref, motion ref, etc)
import 'dotenv/config';

const apiKey = process.env.HF_API_KEY;
const apiSecret = process.env.HF_API_SECRET;
const base = 'https://platform.higgsfield.ai';
const headers = {
  'hf-api-key': apiKey,
  'hf-secret': apiSecret,
  'content-type': 'application/json',
};

console.log('═══ Kling endpoint discovery ═══\n');
const klingCandidates = [
  '/v1/image2video/kling',
  '/v1/image2video/kling-2',
  '/v1/image2video/kling-2.0',
  '/v1/image2video/kling-1.6',
  '/v1/image2video/kling-pro',
  '/v1/image2video/kling-master',
  '/v1/video2video/kling',
  '/v1/motion2video/kling',
  '/v1/image2video/kuaishou',
  '/v1/kling/image2video',
  '/v1/motion-transfer/kling',
  '/v1/motion-control/kling',
];

for (const path of klingCandidates) {
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
      console.log(`  → ${text.slice(0, 600)}`);
      console.log('');
    }
  } catch (e) {
    console.log(`[ERR] ${path}: ${e.message}`);
  }
}

console.log('\n═══ Video-ref / motion-transfer endpoint discovery ═══\n');
const videoRefCandidates = [
  '/v1/video2video/dop',
  '/v1/video2video/seedance',
  '/v1/video2video',
  '/v1/motion-transfer',
  '/v1/motion2video',
  '/v1/image2video/motion-transfer',
  '/v1/image2video/video-ref',
  '/v1/image2video/dop-v2v',
];

for (const path of videoRefCandidates) {
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
      console.log(`  → ${text.slice(0, 600)}`);
      console.log('');
    }
  } catch (e) {
    console.log(`[ERR] ${path}: ${e.message}`);
  }
}

console.log('\n═══ Seedance extra fields probe ═══\n');
// Send a body with extra fields to see which Seedance rejects vs accepts
const extraFields = [
  { field: 'reference_video', value: { type: 'video_url', video_url: 'https://example.com/v.mp4' } },
  { field: 'input_video', value: { type: 'video_url', video_url: 'https://example.com/v.mp4' } },
  { field: 'motion_reference', value: { type: 'video_url', video_url: 'https://example.com/v.mp4' } },
  { field: 'video_ref', value: { type: 'video_url', video_url: 'https://example.com/v.mp4' } },
];

for (const { field, value } of extraFields) {
  const body = {
    params: {
      model: 'seedance_pro',
      prompt: 'test',
      input_image: { type: 'image_url', image_url: 'https://example.com/x.jpg' },
      [field]: value,
    },
  };
  try {
    const r = await fetch(`${base}/v1/image2video/seedance`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    const text = await r.text();
    console.log(`[${r.status}] seedance + ${field}`);
    console.log(`  → ${text.slice(0, 500)}`);
    console.log('');
  } catch (e) {
    console.log(`[ERR] seedance + ${field}: ${e.message}`);
  }
}
