// Probe Higgsfield image2video/dop with upload + correct shape.
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

// Step 1: presign
const presign = await fetch(`${base}/files/generate-upload-url`, {
  method: 'POST',
  headers,
  body: JSON.stringify({ content_type: 'image/jpeg' }),
});
console.log('presign:', presign.status);
if (!presign.ok) {
  console.log(await presign.text());
  process.exit(1);
}
const { upload_url, public_url } = await presign.json();
console.log('public_url:', public_url);

// Step 2: PUT image
const buf = fs.readFileSync('projects/jeans-tryon-video/storyboard/scene-1.jpg');
const put = await fetch(upload_url, {
  method: 'PUT',
  headers: { 'content-type': 'image/jpeg' },
  body: buf,
});
console.log('put:', put.status);

// Step 3: try dop request with public URL
const params = {
  model: 'dop-turbo',
  prompt: 'A woman in a bedroom, subtle natural motion, photorealistic.',
  duration: '5',
  aspect_ratio: '9:16',
  enhance_prompt: true,
  input_images: [{ type: 'image_url', image_url: public_url }],
  motions: [{ id: '5be9d262-82d7-4a74-babf-ee8fefd5c3c3', strength: 0.5 }],
};

const r = await fetch(`${base}/v1/image2video/dop`, {
  method: 'POST',
  headers,
  body: JSON.stringify({ params }),
});
console.log('dop:', r.status);
const text = await r.text();
console.log(text.slice(0, 1500));
