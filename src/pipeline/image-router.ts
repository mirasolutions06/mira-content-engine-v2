import { generateStoryboardFrame } from './storyboard.js';
import { generateGptImage } from './gpt-image.js';
import { generateFluxStoryboardFrame } from './flux-image.js';
import type { ImageProvider, StoryboardGenOptions } from '../types/index.js';

/**
 * Routes image generation to the configured provider.
 * Drop-in replacement for calling generateStoryboardFrame directly.
 */
export async function generateImage(
  provider: ImageProvider,
  options: StoryboardGenOptions,
): Promise<string | null> {
  switch (provider) {
    case 'gpt-image':
      return generateGptImage(options);
    case 'flux-2':
      return generateFluxStoryboardFrame(options);
    case 'gemini':
    default:
      return generateStoryboardFrame(options);
  }
}
