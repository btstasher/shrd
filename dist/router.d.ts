/**
 * shrd - URL Router
 * Detects platform from URL and extracts relevant IDs
 */
import type { Platform, RouteResult } from './types.js';
/**
 * Route a URL to the appropriate platform extractor
 */
export declare function route(url: string): RouteResult;
/**
 * Extract video ID from YouTube URL
 */
export declare function extractYouTubeId(url: string): string | null;
/**
 * Extract tweet ID from Twitter/X URL
 */
export declare function extractTweetId(url: string): string | null;
/**
 * Check if URL is from a supported platform
 */
export declare function isSupported(url: string): boolean;
/**
 * Get human-readable platform name
 */
export declare function getPlatformName(platform: Platform): string;
//# sourceMappingURL=router.d.ts.map