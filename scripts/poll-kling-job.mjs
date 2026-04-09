import 'dotenv/config';
const headers = { 'hf-api-key': process.env.HF_API_KEY, 'hf-secret': process.env.HF_API_SECRET };
const id = process.argv[2] || 'd2b5944f-28ac-4202-92a1-f8d4f32604d2';
for (let i = 0; i < 120; i++) {
  const r = await fetch(`https://platform.higgsfield.ai/v1/job-sets/${id}`, { headers });
  const j = await r.json();
  const status = j.jobs?.[0]?.status ?? 'unknown';
  const url = j.jobs?.[0]?.results?.raw?.url;
  console.log(`[${i * 10}s] ${status}${url ? ' → ' + url : ''}`);
  if (status === 'completed' || status === 'failed' || status === 'nsfw') break;
  await new Promise((r) => setTimeout(r, 10000));
}
