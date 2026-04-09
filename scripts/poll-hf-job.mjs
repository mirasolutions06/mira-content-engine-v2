import 'dotenv/config';
const apiKey = process.env.HF_API_KEY;
const apiSecret = process.env.HF_API_SECRET;
const base = 'https://platform.higgsfield.ai';
const headers = { 'hf-api-key': apiKey, 'hf-secret': apiSecret };

const id = 'f88bee82-197d-4cb9-9216-1bc249be7af3';

// Try a few possible polling endpoints
async function tryGet(p) {
  const r = await fetch(`${base}${p}`, { headers });
  console.log(`${p} → ${r.status}`);
  if (r.ok) {
    const j = await r.json();
    console.log(JSON.stringify(j, null, 2).slice(0, 2000));
    console.log('');
    return true;
  }
  return false;
}

await tryGet(`/v1/job-sets/${id}`);
await tryGet(`/v1/image2video/dop/${id}`);
await tryGet(`/requests/${id}/status`);
