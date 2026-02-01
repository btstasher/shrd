'use server';

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface ShrdResult {
  blog: {
    title: string;
    description: string;
    insights: string[];
    quotes: string[];
    mentions?: string[];
  };
  source: {
    platform: string;
    url: string;
    title: string;
    author: string;
  };
  embed: string;
  markdown: string;
}

/**
 * Process a URL through shrd CLI
 */
export async function processUrl(url: string, targetSite: string): Promise<ShrdResult> {
  // Validate URL
  try {
    new URL(url);
  } catch {
    throw new Error('Invalid URL');
  }

  // Call shrd CLI (it's installed globally)
  try {
    const { stdout, stderr } = await execAsync(
      `shrd "${url}" --format json`,
      {
        timeout: 120000, // 2 minute timeout
        env: {
          ...process.env,
          PATH: `${process.env.HOME}/.npm-global/bin:${process.env.PATH}`,
        },
      }
    );

    if (stderr && !stdout) {
      throw new Error(stderr);
    }

    // Parse the JSON output
    const result = JSON.parse(stdout);
    
    // Add target site context (for future use)
    result.targetSite = targetSite;
    
    return result;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('Failed to parse shrd output');
    }
    throw new Error(`Processing failed: ${(error as Error).message}`);
  }
}

/**
 * Save a draft to the database
 */
export async function saveDraft(
  content: ShrdResult,
  targetSite: string
): Promise<{ id: string }> {
  // TODO: Implement with Prisma
  // For now, just return a mock ID
  return { id: `draft_${Date.now()}` };
}

/**
 * Publish to a target site
 */
export async function publishToSite(
  draftId: string,
  targetSite: string
): Promise<{ url: string }> {
  // TODO: Implement per-site publishing
  // Each site will need its own API integration
  
  switch (targetSite) {
    case 'hrvstr':
      // POST to hrvstr.com API
      break;
    case 'tpl':
      // POST to theperfectlie.net API
      break;
    case 'tplgolf':
      // POST to tplgolf.com API
      break;
    default:
      // Save to shrd.co
      break;
  }
  
  return { url: `https://${targetSite}.com/drafts/${draftId}` };
}
