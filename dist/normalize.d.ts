/**
 * shrd - Content Normalizer
 * Transforms extracted content into a unified format for generation
 */
import type { ExtractedContent, NormalizedContent } from './types.js';
/**
 * Normalize extracted content into a unified format
 */
export declare function normalize(content: ExtractedContent): NormalizedContent;
/**
 * Truncate content to a maximum length while preserving word boundaries
 */
export declare function truncateContent(text: string, maxLength: number): string;
/**
 * Get a summary-appropriate excerpt from content
 */
export declare function getExcerpt(content: NormalizedContent, maxLength?: number): string;
//# sourceMappingURL=normalize.d.ts.map