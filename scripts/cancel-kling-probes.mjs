import 'dotenv/config';

const headers = {
  'hf-api-key': process.env.HF_API_KEY,
  'hf-secret': process.env.HF_API_SECRET,
  'content-type': 'application/json',
};
const base = 'https://platform.higgsfield.ai';

const jobIds = [
  'b934b77d-f115-4608-83c9-993eb5f16eaf',
  '3ebf9faf-7a28-4ff1-91f6-0e3fe6c00d25',
  'c3a1e7d6-84d0-4478-a409-a176bee21ada',
  '6c8e54b0-89a9-4fdd-9024-21e65dbaa2ee',
];

for (const id of jobIds) {
  // Status
  const statusRes = await fetch(`${base}/v1/job-sets/${id}`, { headers });
  const status = await statusRes.json();
  const jobStatus = status.jobs?.[0]?.status ?? 'unknown';
  const resultUrl = status.jobs?.[0]?.results?.raw?.url ?? status.jobs?.[0]?.results?.min?.url ?? null;
  console.log(`[${id.slice(0, 8)}] ${jobStatus}${resultUrl ? ' → ' + resultUrl : ''}`);

  // Try to cancel if still queued or in_progress
  if (jobStatus === 'queued' || jobStatus === 'in_progress') {
    const cancelRes = await fetch(`${base}/requests/${id}/cancel`, {
      method: 'POST',
      headers,
    });
    console.log(`  cancel: ${cancelRes.status} ${(await cancelRes.text()).slice(0, 150)}`);
  }
}
