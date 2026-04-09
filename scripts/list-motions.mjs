import 'dotenv/config';
import crypto from 'crypto';

const apiKey = process.env.HF_API_KEY;
const apiSecret = process.env.HF_API_SECRET;
const base = 'https://platform.higgsfield.ai';

// Try a few common auth schemes — one of them should work.
const headers = { 'hf-api-key': apiKey, 'hf-secret': apiSecret };
const r = await fetch(`${base}/v1/motions?limit=1000`, { headers });
if (!r.ok) {
  console.error('FAIL', r.status, await r.text());
  process.exit(1);
}
const list = await r.json();
console.error(`Got ${Array.isArray(list) ? list.length : 'non-array'} motions`);
process.stdout.write(JSON.stringify(list, null, 2));
