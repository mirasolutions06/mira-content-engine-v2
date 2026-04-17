// Direct keyframe interpolation test on both Kling variants.
// Uses our real scene-1.jpg and 4-story.jpg (end frame).
// WILL BILL: one real 5s clip per run, ~$1.50 each.
import 'dotenv/config';
import fs from 'fs';

const headers = {
  'hf-api-key': process.env.HF_API_KEY,
  'hf-secret': process.env.HF_API_SECRET,
  'content-type': 'application/json',
};
const base = 'https://platform.higgsfield.ai';

async function uploadImage(pathStr) {
  const presign = await fetch(`${base}/files/generate-upload-url`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ content_type: 'image/jpeg' }),
  }).then((r) => r.json());
  await fetch(presign.upload_url, {
    method: 'PUT',
    headers: { 'content-type': 'image/jpeg' },
    body: fs.readFileSync(pathStr),
  });
  return presign.public_url;
}

const startUrl = await uploadImage('projects/jeans-tryon-video-kling/storyboard/scene-1.jpg');
const endUrl = await uploadImage('projects/jeans-tryon-video-kling/storyboard/scene-1-end.jpg');
console.log('start:', startUrl);
console.log('end:', endUrl);
console.log();

async function tryKeyframe(model, duration = 5) {
  const body = {
    params: {
      model,
      prompt: 'Woman turns her body from facing camera to three-quarter rear view, smooth continuous motion.',
      input_image: { type: 'image_url', image_url: startUrl },
      input_image_end: { type: 'image_url', image_url: endUrl },
      duration,
      cfg_scale: 0.5,
      enhance_prompt: true,
    },
  };
  const r = await fetch(`${base}/v1/image2video/kling`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const text = await r.text();
  console.log(`[POST ${r.status}] model=${model} duration=${duration}`);
  console.log(`  → ${text.slice(0, 500)}`);
  if (r.ok) {
    const j = JSON.parse(text);
    const id = j.id;
    console.log(`  waiting for job ${id}...`);
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 5000));
      const pr = await fetch(`${base}/v1/job-sets/${id}`, { headers });
      const pj = await pr.json();
      const status = pj.jobs?.[0]?.status;
      const url = pj.jobs?.[0]?.results?.raw?.url;
      console.log(`  [${(i + 1) * 5}s] ${status}${url ? ' → ' + url : ''}`);
      if (status === 'completed') return url;
      if (status === 'failed' || status === 'nsfw') return null;
    }
  }
  return null;
}

console.log('\n═══ Trying kling-v2-1 (standard, NOT master) ═══\n');
const result = await tryKeyframe('kling-v2-1', 5);
if (result) {
  console.log('\n✅ STANDARD KLING SUPPORTS KEYFRAMES!');
  console.log('URL:', result);
} else {
  console.log('\n❌ Standard Kling also fails on keyframes. Feature not supported on HF API.');
}
