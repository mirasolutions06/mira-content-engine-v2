import 'dotenv/config';
const headers = { 'hf-api-key': process.env.HF_API_KEY, 'hf-secret': process.env.HF_API_SECRET };
const id = 'b251afda-2bc2-494d-aee2-ed0b2072a807';
for (let i = 0; i < 60; i++) {
  const r = await fetch(`https://platform.higgsfield.ai/v1/job-sets/${id}`, { headers });
  const j = await r.json();
  const status = j.jobs?.[0]?.status;
  console.log(`[${i * 5}s] ${status}`);
  if (status === 'completed' || status === 'failed' || status === 'nsfw') {
    console.log(JSON.stringify(j.jobs[0], null, 2));
    break;
  }
  await new Promise((r) => setTimeout(r, 5000));
}
