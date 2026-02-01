/**
 * shrd - URL Router
 * Detects platform from URL and extracts relevant IDs
 */

import type { Platform, RouteResult } from './types.js';

const PATTERNS: Record<Platform, RegExp[]> = {
  youtube: [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ],
  twitter: [
    /(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/,
  ],
  tiktok: [
    /tiktok\.com\/@[\w.-]+\/video\/(\d+)/,
    /tiktok\.com\/t\/(\w+)/,
    /vm\.tiktok\.com\/(\w+)/,
  ],
  instagram: [
    /instagram\.com\/(?:p|reel|reels)\/([a-zA-Z0-9_-]+)/,
  ],
  podcast: [
    /\.mp3(?:\?|$)/i,
    /\.m4a(?:\?|$)/i,
    /anchor\.fm/,
    /podcasts\.apple\.com/,
    /open\.spotify\.com\/episode/,
  ],
  article: [], // Fallback - matches everything else
  unknown: [],
};

/**
 * Route a URL to the appropriate platform extractor
 */
export function route(url: string): RouteResult {
  // Normalize URL
  const normalizedUrl = url.trim();
  
  // Check each platform's patterns
  for (const [platform, patterns] of Object.entries(PATTERNS) as [Platform, RegExp[]][]) {
    if (platform === 'article' || platform === 'unknown') continue;
    
    for (const pattern of patterns) {
      const match = normalizedUrl.match(pattern);
      if (match) {
        return {
          platform,
          url: normalizedUrl,
          id: match[1],
        };
      }
    }
  }
  
  // Check if it looks like a valid URL (fallback to article)
  try {
    const parsed = new URL(normalizedUrl);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return {
        platform: 'article',
        url: normalizedUrl,
      };
    }
  } catch {
    // Not a valid URL
  }
  
  return {
    platform: 'unknown',
    url: normalizedUrl,
  };
}

/**
 * Extract video ID from YouTube URL
 */
export function extractYouTubeId(url: string): string | null {
  for (const pattern of PATTERNS.youtube) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * Extract tweet ID from Twitter/X URL
 */
export function extractTweetId(url: string): string | null {
  for (const pattern of PATTERNS.twitter) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * Check if URL is from a supported platform
 */
export function isSupported(url: string): boolean {
  const result = route(url);
  return result.platform !== 'unknown';
}

/**
 * Get human-readable platform name
 */
export function getPlatformName(platform: Platform): string {
  const names: Record<Platform, string> = {
    youtube: 'YouTube',
    twitter: 'Twitter/X',
    tiktok: 'TikTok',
    instagram: 'Instagram',
    podcast: 'Podcast',
    article: 'Article',
    unknown: 'Unknown',
  };
  return names[platform];
}
