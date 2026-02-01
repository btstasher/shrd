/**
 * shrd - Output Formatter
 * Formats generated blog content into various output formats
 */
import type { GeneratedBlog, NormalizedContent, ShrdOutput, OutputFormat } from './types.js';
/**
 * Format the complete shrd output
 */
export declare function format(blog: GeneratedBlog, content: NormalizedContent, outputFormat?: OutputFormat): ShrdOutput;
/**
 * Format as Markdown (primary output)
 */
export declare function formatMarkdown(blog: GeneratedBlog, content: NormalizedContent): string;
/**
 * Format as HTML
 */
export declare function formatHtml(blog: GeneratedBlog, content: NormalizedContent): string;
/**
 * Format as JSON
 */
export declare function formatJson(blog: GeneratedBlog, content: NormalizedContent): string;
/**
 * Generate filename from blog title
 */
export declare function generateFilename(title: string, format?: OutputFormat): string;
//# sourceMappingURL=format.d.ts.map