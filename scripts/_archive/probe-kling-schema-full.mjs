// Discover Kling schema fully — optional fields, duration constraints, aspect ratio options.
import 'dotenv/config';
import fs from 'fs';

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
  console.log(`  → ${text.slice(0, 1500)}`);
  console.log('');
  return { status: r.status, text };
}

// Upload our existing scene-1 image to get a real URL
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
const imageUrl = presign.public_url;
console.log('Uploaded:', imageUrl, '\n');

// Minimal valid body (will fire a real generation — ~$1-2, so do once)
// BUT first let's probe duration enum by sending invalid ones
await probe({
  params: {
    model: 'kling-v2-1-master',
    prompt: 'test',
    input_image: { type: 'image_url', image_url: imageUrl },
    duration: 999,  // invalid, will reveal allowed enum
  },
}, 'kling-v2-1-master + duration 999 (to get enum)');

await probe({
  params: {
    model: 'kling-v2-1-master',
    prompt: 'test',
    input_image: { type: 'image_url', image_url: imageUrl },
    aspect_ratio: 'nonsense',  // invalid, will reveal allowed enum
  },
}, 'kling-v2-1-master + aspect_ratio nonsense');

// Probe motion_id field
await probe({
  params: {
    model: 'kling-v2-1-master',
    prompt: 'test',
    input_image: { type: 'image_url', image_url: imageUrl },
    motion_id: 'bogus',
  },
}, 'kling-v2-1-master + motion_id bogus');

// Probe camera_fixed field
await probe({
  params: {
    model: 'kling-v2-1-master',
    prompt: 'test',
    input_image: { type: 'image_url', image_url: imageUrl },
    camera_fixed: 'notabool',
  },
}, 'kling-v2-1-master + camera_fixed notabool');

// Probe input_image_end (start+end frame interpolation) - fake URL, will 422 or 500
await probe({
  params: {
    model: 'kling-v2-1-master',
    prompt: 'test',
    input_image: { type: 'image_url', image_url: imageUrl },
    input_image_end: { type: 'image_url', image_url: imageUrl },
  },
}, 'kling + input_image_end (start/end frames)');

// Probe: does it accept a reference_video / motion_video field?
await probe({
  params: {
    model: 'kling-v2-1-master',
    prompt: 'test',
    input_image: { type: 'image_url', image_url: imageUrl },
    reference_video: { type: 'video_url', video_url: 'https://example.com/v.mp4' },
  },
}, 'kling + reference_video (fake)');
