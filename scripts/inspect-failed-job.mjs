import 'dotenv/config';
const headers = { 'hf-api-key': process.env.HF_API_KEY, 'hf-secret': process.env.HF_API_SECRET };
const id = '5d5c4c9b-07b6-4e59-9939-5535d7748019';
const r = await fetch(`https://platform.higgsfield.ai/v1/job-sets/${id}`, { headers });
const j = await r.json();
console.log(JSON.stringify(j, null, 2));
