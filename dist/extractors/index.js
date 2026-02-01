/**
 * shrd - Extractors Index
 * Registry of all content extractors
 */
import { route } from '../router.js';
import { youtubeExtractor } from './youtube.js';
import { articleExtractor } from './article.js';
import { podcastExtractor } from './podcast.js';
import { twitterExtractor } from './twitter.js';
import { tiktokExtractor } from './tiktok.js';
import { instagramExtractor } from './instagram.js';
// Registry of all extractors
const extractors = new Map([
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
export function getExtractor(url) {
    const { platform } = route(url);
    return extractors.get(platform) || extractors.get('article') || null;
}
/**
 * Extract content from any supported URL
 */
export async function extract(url) {
    const extractor = getExtractor(url);
    if (!extractor) {
        throw new Error(`No extractor available for URL: ${url}`);
    }
    return extractor.extract(url);
}
/**
 * Check if a URL can be extracted
 */
export function canExtract(url) {
    const extractor = getExtractor(url);
    return extractor !== null && extractor.canHandle(url);
}
/**
 * List all supported platforms
 */
export function getSupportedPlatforms() {
    return Array.from(extractors.keys());
}
export { youtubeExtractor, articleExtractor, podcastExtractor, twitterExtractor, tiktokExtractor, instagramExtractor, };
//# sourceMappingURL=index.js.map