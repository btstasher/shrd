/**
 * shrd - Blog Generator
 * Uses LLM to generate original blog content from source material
 * Prefers OpenClaw gateway (Sonnet), falls back to direct API calls
 */
import type { NormalizedContent, GeneratedBlog, GenerateOptions } from './types.js';
/**
 * Generate a blog post from normalized content
 * Tries OpenClaw gateway first, falls back to direct API
 */
export declare function generate(content: NormalizedContent, options?: GenerateOptions): Promise<GeneratedBlog>;
//# sourceMappingURL=generate.d.ts.map