// Safe probe for Seedance 2.0 on Higgsfield.
// Uses a BOGUS image URL so any endpoint that silently accepts the body will
// fail during image fetch (not be billed).
import 'dotenv/config';

const apiKey = process.env.HF_API_KEY;
const apiSecret = process.env.HF_API_SECRET;
const base = 'https://platform.higgsfield.ai';
const headers = {
  'hf-api-key': apiKey,
  'hf-secret': apiSecret,
  'content-type': 'application/json',
};

// 🛑 Intentionally invalid image URL to prevent billing on silent-accept endpoints
const BOGUS_IMAGE = 'https://bogus-invalid-domain-for-probing.invalid/fake.jpg';

console.log('═══ Alternate Seedance endpoints ═══\n');
const endpointCandidates = [
  '/v1/image2video/seedance-2',
  '/v1/image2video/seedance-2.0',
  '/v1/image2video/seedance2',
  '/v1/image2video/seedance-v2',
  '/v1/image2video/seedance-pro-v2',
  '/v1/image2video/seedance-2-pro',
  '/v1/image2video/bytedance',
  '/v1/image2video/bytedance-seedance',
  '/v1/image2video/bytedance-v2',
  '/v1/multimodal/seedance',
  '/v1/multimodal/seedance-2',
  '/v1/generate/seedance-2',
  '/v1/seedance-2',
  '/v1/seedance-v2',
  '/v1/seedance2/image2video',
  '/v2/image2video/seedance',
];

for (const path of endpointCandidates) {
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
      console.log(`  → ${text.slice(0, 500)}`);
      console.log('');
    }
  } catch (e) {
    console.log(`[ERR] ${path}: ${e.message}`);
  }
}

console.log('\n═══ Alternate Seedance model names on existing endpoint ═══\n');
// Try new model names against the known /v1/image2video/seedance endpoint
const modelCandidates = [
  'seedance_v2',
  'seedance_pro_v2',
  'seedance_2',
  'seedance_2_pro',
  'seedance_2_lite',
  'seedance-pro-v2',
  'seedance-v2-pro',
  'seedance-v2-master',
  'seedance_pro_2',
  'seedance_master',
];

for (const model of modelCandidates) {
  try {
    const r = await fetch(`${base}/v1/image2video/seedance`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        params: {
          model,
          prompt: 'test',
          input_image: { type: 'image_url', image_url: BOGUS_IMAGE },
        },
      }),
    });
    const text = await r.text();
    console.log(`[${r.status}] model=${model}`);
    if (r.status !== 200 || text.includes('error')) {
      console.log(`  → ${text.slice(0, 400)}`);
    }
    console.log('');
  } catch (e) {
    console.log(`[ERR] ${model}: ${e.message}`);
  }
}

console.log('\n═══ Alternate "text2video/seedance" endpoint (Seedance 2.0 is multimodal) ═══\n');
const t2vCandidates = [
  '/v1/text2video/seedance',
  '/v1/text2video/seedance-2',
  '/v1/text2video/seedance-v2',
  '/v1/text2video/seedance-2.0',
];
for (const path of t2vCandidates) {
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
      console.log(`  → ${text.slice(0, 500)}`);
      console.log('');
    }
  } catch (e) {
    console.log(`[ERR] ${path}: ${e.message}`);
  }
}

console.log('\n═══ "video2video" + "multimodal" endpoints (for video-ref support) ═══\n');
const v2vCandidates = [
  '/v1/video2video/seedance',
  '/v1/video2video/seedance-2',
  '/v1/motion-control/seedance',
  '/v1/multimodal/seedance',
  '/v1/generate/video',
];
for (const path of v2vCandidates) {
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
      console.log(`  → ${text.slice(0, 500)}`);
      console.log('');
    }
  } catch (e) {
    console.log(`[ERR] ${path}: ${e.message}`);
  }
}
