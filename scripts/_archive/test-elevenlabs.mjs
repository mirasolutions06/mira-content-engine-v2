import 'dotenv/config';
import { ElevenLabsClient } from 'elevenlabs';

const client = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY });
const result = await client.textToSpeech.convert('cgSgspJ2msm6clMCkdW9', {
  text: 'Quick test',
  model_id: 'eleven_multilingual_v2',
});
console.log('typeof:', typeof result);
console.log('constructor:', result?.constructor?.name);
console.log('keys:', result ? Object.getOwnPropertyNames(Object.getPrototypeOf(result)).slice(0, 30) : 'null');
console.log('has pipe:', typeof result?.pipe);
console.log('has getReader:', typeof result?.getReader);
console.log('has asyncIterator:', typeof result?.[Symbol.asyncIterator]);
console.log('has on:', typeof result?.on);
