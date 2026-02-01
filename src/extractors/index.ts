/**
 * shrd - Extractors Index
 * Registry of all content extractors
 */

import type { Extractor, Platform, ExtractedContent } from '../types.js';
import { route } from '../router.js';
import { youtubeExtractor } from './youtube.js';
import { articleExtractor } from './article.js';
import { podcastExtractor } from './podcast.js';
import { twitterExtractor } from './twitter.js';
import { tiktokExtractor } from './tiktok.js';
import { instagramExtractor } from './instagram.js';

// Registry of all extractors
const extractors: Map<Platform, Extractor> = new Map([
  ['youtube', youtubeExtractor],
  ['article', articleExtractor],
  ['podcast', podcastExtractor],
  ['twitter', twitterExtractor],
  ['tiktok', tiktokExtractor],
  ['instagram', instagramExtractor],
]);

/**
 * Get the appropriate extractor for a URL
 */
export function getExtractor(url: string): Extractor | null {
  const { platform } = route(url);
  return extractors.get(platform) || extractors.get('article') || null;
}

/**
 * Extract content from any supported URL
 */
export async function extract(url: string): Promise<ExtractedContent> {
  const extractor = getExtractor(url);
  
  if (!extractor) {
    throw new Error(`No extractor available for URL: ${url}`);
  }
  
  return extractor.extract(url);
}

/**
 * Check if a URL can be extracted
 */
export function canExtract(url: string): boolean {
  const extractor = getExtractor(url);
  return extractor !== null && extractor.canHandle(url);
}

/**
 * List all supported platforms
 */
export function getSupportedPlatforms(): Platform[] {
  return Array.from(extractors.keys());
}

export { 
  youtubeExtractor, 
  articleExtractor, 
  podcastExtractor,
  twitterExtractor,
  tiktokExtractor,
  instagramExtractor,
};
