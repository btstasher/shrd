/**
 * shrd - Extractors Index
 * Registry of all content extractors
 */
import type { Extractor, Platform, ExtractedContent } from '../types.js';
import { youtubeExtractor } from './youtube.js';
import { articleExtractor } from './article.js';
import { podcastExtractor } from './podcast.js';
import { twitterExtractor } from './twitter.js';
import { tiktokExtractor } from './tiktok.js';
import { instagramExtractor } from './instagram.js';
/**
 * Get the appropriate extractor for a URL
 */
export declare function getExtractor(url: string): Extractor | null;
/**
 * Extract content from any supported URL
 */
export declare function extract(url: string): Promise<ExtractedContent>;
/**
 * Check if a URL can be extracted
 */
export declare function canExtract(url: string): boolean;
/**
 * List all supported platforms
 */
export declare function getSupportedPlatforms(): Platform[];
export { youtubeExtractor, articleExtractor, podcastExtractor, twitterExtractor, tiktokExtractor, instagramExtractor, };
//# sourceMappingURL=index.d.ts.map