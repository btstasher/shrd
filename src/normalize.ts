/**
 * shrd - Content Normalizer
 * Transforms extracted content into a unified format for generation
 */

import type { ExtractedContent, NormalizedContent } from './types.js';

/**
 * Normalize extracted content into a unified format
 */
export function normalize(content: ExtractedContent): NormalizedContent {
  // Get the main text content
  const text = content.transcript || content.description || '';
  
  // Calculate metrics
  const wordCount = countWords(text);
  const readingTime = Math.ceil(wordCount / 200); // ~200 WPM average
  
  return {
    source: {
      platform: content.platform,
      url: content.url,
      title: content.title,
      author: content.author,
      authorUrl: content.authorUrl,
      date: content.date,
    },
    content: {
      text,
      wordCount,
      readingTime,
    },
    media: {
      embedCode: content.embedCode || '',
      thumbnailUrl: content.thumbnailUrl,
    },
    metadata: {
      links: content.links || [],
      timestamps: content.timestamps || [],
      duration: content.duration,
    },
  };
}

/**
 * Count words in text
 */
function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter(word => word.length > 0)
    .length;
}

/**
 * Truncate content to a maximum length while preserving word boundaries
 */
export function truncateContent(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  
  const truncated = text.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastSpace > maxLength * 0.8) {
    return truncated.slice(0, lastSpace) + '...';
  }
  
  return truncated + '...';
}

/**
 * Get a summary-appropriate excerpt from content
 */
export function getExcerpt(content: NormalizedContent, maxLength: number = 500): string {
  return truncateContent(content.content.text, maxLength);
}
