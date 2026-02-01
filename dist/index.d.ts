/**
 * shrd - Drop a link. Get a blog post.
 *
 * Universal content-to-blog engine that takes any URL and generates
 * original, publish-ready blog posts with embedded source content.
 */
export * from './types.js';
export * from './router.js';
export * from './extractors/index.js';
export * from './normalize.js';
export * from './generate.js';
export * from './gateway.js';
export * from './format.js';
export * from './embeds/index.js';
export * from './transcribe.js';
import type { ShrdOutput, GenerateOptions, OutputFormat } from './types.js';
export interface ShrdOptions extends GenerateOptions {
    extractOnly?: boolean;
    outputFormat?: OutputFormat;
}
/**
 * Main entry point - process a URL and generate blog content
 */
export declare function shrd(url: string, options?: ShrdOptions): Promise<ShrdOutput>;
/**
 * Quick info about a URL without full processing
 */
export declare function info(url: string): Promise<{
    platform: string;
    platformName: string;
    supported: boolean;
}>;
//# sourceMappingURL=index.d.ts.map