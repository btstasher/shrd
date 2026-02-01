/**
 * shrd - OpenClaw Gateway Integration
 * Routes blog generation through OpenClaw instead of direct API calls
 */
import type { NormalizedContent, GeneratedBlog, GenerateOptions } from './types.js';
/**
 * Generate blog content by routing through OpenClaw gateway
 */
export declare function generateViaGateway(content: NormalizedContent, options?: GenerateOptions): Promise<GeneratedBlog>;
/**
 * Check if gateway is available
 */
export declare function isGatewayAvailable(): Promise<boolean>;
//# sourceMappingURL=gateway.d.ts.map