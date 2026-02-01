/**
 * shrd - OpenClaw Gateway Integration
 * Routes blog generation through OpenClaw instead of direct API calls
 */

import type { NormalizedContent, GeneratedBlog, GenerateOptions } from './types.js';
import { truncateContent } from './normalize.js';

// Gateway configuration from environment or defaults
const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || 'http://localhost:18789';
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || '';

// Maximum content length to send (keep prompts reasonable)
const MAX_CONTENT_LENGTH = 100000;

interface GatewayMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface GatewayResponse {
  ok: boolean;
  response?: string;
  error?: string;
}

/**
 * Generate blog content by routing through OpenClaw gateway
 */
export async function generateViaGateway(
  content: NormalizedContent,
  options: GenerateOptions = {}
): Promise<GeneratedBlog> {
  const { style = 'blog', tone = 'professional', perspective } = options;
  
  // Prepare content for generation
  const sourceText = truncateContent(content.content.text, MAX_CONTENT_LENGTH);
  
  // Build the prompt
  const prompt = buildPrompt(content, sourceText, { style, tone, perspective });
  
  // Call the gateway
  const response = await callGateway(prompt);
  
  // Parse the response
  return parseResponse(response);
}

/**
 * Build the generation prompt
 */
function buildPrompt(
  content: NormalizedContent,
  sourceText: string,
  options: { style: string; tone: string; perspective?: string }
): string {
  const { style, tone, perspective } = options;
  
  const perspectiveInstruction = perspective 
    ? `Write from the perspective of ${perspective}.`
    : '';
  
  const timestamps = content.metadata.timestamps.length > 0
    ? `\nTIMESTAMPS:\n${content.metadata.timestamps.map(t => `${formatTime(t.time)} - ${t.label}`).join('\n')}`
    : '';
  
  return `Generate a blog post from this content. Respond with ONLY valid JSON.

SOURCE:
- Platform: ${content.source.platform}
- Title: "${content.source.title}"
- Author: ${content.source.author}
- Date: ${content.source.date || 'Unknown'}
${timestamps}

CONTENT (${content.content.wordCount} words):
${sourceText}

REQUIREMENTS:
1. TITLE: Original, compelling (don't copy source title)
2. DESCRIPTION: 2-3 sentences with YOUR perspective ${perspectiveInstruction}
3. INSIGHTS: 3-5 actionable takeaways (not just summaries)
4. QUOTES: 2-3 best quotable moments from the content
5. MENTIONS: Tools, products, companies, people mentioned

TONE: ${tone} | STYLE: ${style}

JSON FORMAT:
{"title":"...","description":"...","insights":["..."],"quotes":["..."],"mentions":["..."]}`;
}

/**
 * Call the OpenClaw gateway
 */
async function callGateway(prompt: string): Promise<string> {
  // Check for gateway token
  const token = GATEWAY_TOKEN || await readGatewayToken();
  
  if (!token) {
    throw new Error(
      'OpenClaw gateway token not found. Set OPENCLAW_GATEWAY_TOKEN or ensure OpenClaw is running.'
    );
  }
  
  // Use the agent turn endpoint for generation
  const response = await fetch(`${GATEWAY_URL}/api/v1/agent/turn`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      message: prompt,
      model: 'anthropic/claude-sonnet-4-5', // Use Sonnet for generation tasks
      isolated: true, // Don't pollute main session
      timeoutSeconds: 120,
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gateway error: ${response.status} - ${error}`);
  }
  
  const data = await response.json() as GatewayResponse;
  
  if (!data.ok || !data.response) {
    throw new Error(data.error || 'No response from gateway');
  }
  
  return data.response;
}

/**
 * Try to read gateway token from OpenClaw config
 */
async function readGatewayToken(): Promise<string | null> {
  try {
    const fs = await import('fs');
    const path = await import('path');
    const os = await import('os');
    
    const configPath = path.join(os.homedir(), '.openclaw', 'openclaw.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    
    return config?.gateway?.auth?.token || null;
  } catch {
    return null;
  }
}

/**
 * Parse LLM response into structured blog content
 */
function parseResponse(response: string): GeneratedBlog {
  try {
    // Try to extract JSON from the response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    return {
      title: parsed.title || 'Untitled',
      description: parsed.description || '',
      insights: Array.isArray(parsed.insights) ? parsed.insights : [],
      quotes: Array.isArray(parsed.quotes) ? parsed.quotes : [],
      mentions: Array.isArray(parsed.mentions) ? parsed.mentions : [],
    };
  } catch (error) {
    throw new Error(`Failed to parse response: ${(error as Error).message}`);
  }
}

/**
 * Format seconds to timestamp string
 */
function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Check if gateway is available
 */
export async function isGatewayAvailable(): Promise<boolean> {
  try {
    const token = GATEWAY_TOKEN || await readGatewayToken();
    if (!token) return false;
    
    const response = await fetch(`${GATEWAY_URL}/api/v1/status`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    
    return response.ok;
  } catch {
    return false;
  }
}
