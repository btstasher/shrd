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
import { extract } from './extractors/index.js';
import { normalize } from './normalize.js';
import { generate } from './generate.js';
import { format } from './format.js';
import { route, getPlatformName } from './router.js';

export interface ShrdOptions extends GenerateOptions {
  extractOnly?: boolean;
  outputFormat?: OutputFormat;
}

/**
 * Main entry point - process a URL and generate blog content
 */
export async function shrd(url: string, options: ShrdOptions = {}): Promise<ShrdOutput> {
  const { extractOnly, outputFormat = 'markdown', ...generateOptions } = options;
  
  // Step 1: Route and extract
  const extracted = await extract(url);
  
  // Step 2: Normalize
  const normalized = normalize(extracted);
  
  // If extract only, return with placeholder blog
  if (extractOnly) {
    return format(
      {
        title: extracted.title,
        description: extracted.description || '',
        insights: [],
        quotes: [],
      },
      normalized,
      outputFormat
    );
  }
  
  // Step 3: Generate blog content
  const blog = await generate(normalized, generateOptions);
  
  // Step 4: Format output
  return format(blog, normalized, outputFormat);
}

/**
 * Quick info about a URL without full processing
 */
export async function info(url: string): Promise<{
  platform: string;
  platformName: string;
  supported: boolean;
}> {
  const result = route(url);
  return {
    platform: result.platform,
    platformName: getPlatformName(result.platform),
    supported: result.platform !== 'unknown',
  };
}
