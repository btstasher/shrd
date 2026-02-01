/**
 * shrd - Embed Code Generators
 * Generate platform-specific embed HTML
 */
import type { Platform } from '../types.js';
interface ArticleEmbedOptions {
    title?: string;
    description?: string;
    image?: string;
    siteName?: string;
}
/**
 * Generate embed code for a given platform
 */
export declare function generateEmbed(platform: Platform, idOrUrl: string, options?: ArticleEmbedOptions): string;
/**
 * Generate markdown-compatible embed
 * For platforms that don't have native markdown support
 */
export declare function generateMarkdownEmbed(platform: Platform, idOrUrl: string): string;
export {};
//# sourceMappingURL=index.d.ts.map