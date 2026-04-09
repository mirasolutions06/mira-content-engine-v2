// Probe which Higgsfield DoP model accepts duration: '10' and actually returns 10s.
import 'dotenv/config';
import fs from 'fs';

const apiKey = process.env.HF_API_KEY;
const apiSecret = process.env.HF_API_SECRET;
const base = 'https://platform.higgsfield.ai';
const headers = {
  'hf-api-key': apiKey,
  'hf-secret': apiSecret,
  'content-type': 'application/json',
};

// Get a presigned URL + upload the existing scene-1 image
const presign = await fetch(`${base}/files/generate-upload-url`, {
  method: 'POST',
  headers,
  body: JSON.stringify({ content_type: 'image/jpeg' }),
}).then((r) => r.json());

const buf = fs.readFileSync('projects/jeans-tryon-video/storyboard/scene-1.jpg');
await fetch(presign.upload_url, {
  method: 'PUT',
  headers: { 'content-type': 'image/jpeg' },
  body: buf,
});
console.log('uploaded:', presign.public_url);

const STATIC_MOTION = 'fa3ddb7c-53ee-4383-aa17-97ae65f180e5';

async function probe(model, duration) {
  const params = {
    model,
    prompt: 'Static camera, woman stands in bedroom with subtle natural breathing and tiny weight shift, no camera motion.',
    duration: String(duration),
    aspect_ratio: '9:16',
    enhance_prompt: false,
    input_images: [{ type: 'image_url', image_url: presign.public_url }],
    motions: [{ id: STATIC_MOTION, strength: 1.0 }],
  };
  const r = await fetch(`${base}/v1/image2video/dop`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ params }),
  });
  const text = await r.text();
  console.log(`[${model} duration=${duration}] status ${r.status}`);
  if (!r.ok) {
    console.log('  error:', text.slice(0, 400));
    return null;
  }
  const j = JSON.parse(text);
  console.log('  job id:', j.id);
  return j.id;
}

// Validation-only probes — they'll go through but we'll cancel by not waiting.
// The "test" submissions will still count toward billing if they complete.
// Strategy: only call ONCE with the most likely-to-work option based on naming.
//   dop-preview is typically the "preview" / higher-quality variant that supports longer durations.
const id = await probe('dop-preview', 10);
console.log('Submitted job:', id);
console.log('Now poll /v1/job-sets/' + id + ' until completed, then check duration.');
