/**
 * shrd - Instagram Extractor
 * Handles Posts and Reels using yt-dlp and Whisper
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomBytes } from 'crypto';
import type { Extractor, ExtractedContent } from '../types.js';
import { generateEmbed } from '../embeds/index.js';
import { transcribe } from '../transcribe.js';

const execAsync = promisify(exec);
const YTDLP_PATH = '/usr/local/bin/yt-dlp';

// URL patterns
const INSTAGRAM_PATTERNS = [
  /instagram\.com\/p\/([a-zA-Z0-9_-]+)/,
  /instagram\.com\/reel\/([a-zA-Z0-9_-]+)/,
  /instagram\.com\/reels\/([a-zA-Z0-9_-]+)/,
];

export const instagramExtractor: Extractor = {
  name: 'instagram',
  
  canHandle(url: string): boolean {
    return INSTAGRAM_PATTERNS.some(pattern => pattern.test(url));
  },
  
  async extract(url: string): Promise<ExtractedContent> {
    const env = {
      ...process.env,
      PATH: `${process.env.HOME}/.deno/bin:${process.env.PATH}`,
    };
    
    // Determine if it's a reel (video) or post (could be image)
    const isReel = /\/reel[s]?\//.test(url);
    
    // Get metadata via yt-dlp
    let metadata: InstagramMetadata;
    try {
      const { stdout } = await execAsync(
        `${YTDLP_PATH} --skip-download -j "${url}" 2>/dev/null`,
        { env }
      );
      metadata = JSON.parse(stdout);
    } catch (error) {
      // yt-dlp might fail for some posts, try oEmbed as fallback
      return await extractViaOEmbed(url);
    }
    
    const username = metadata.uploader || metadata.channel || 'unknown';
    
    // Get transcript via Whisper for reels/videos
    let transcript: string | undefined;
    
    if (metadata.duration && metadata.duration > 0 && process.env.OPENAI_API_KEY) {
      const audioPath = join(tmpdir(), `shrd-instagram-${randomBytes(4).toString('hex')}`);
      
      try {
        console.log('Downloading Instagram audio...');
        await execAsync(
          `${YTDLP_PATH} -x --audio-format mp3 --audio-quality 128K -o "${audioPath}.%(ext)s" "${url}" 2>/dev/null`,
          { env }
        );
        
        // Find the downloaded file
        const { stdout: files } = await execAsync(`ls -1 "${audioPath}".* 2>/dev/null || true`);
        const audioFile = files.trim().split('\n')[0];
        
        if (audioFile && existsSync(audioFile)) {
          console.log('Transcribing Instagram audio...');
          const result = await transcribe({ audioPath: audioFile });
          transcript = result.text;
          
          // Cleanup
          unlinkSync(audioFile);
        }
      } catch (error) {
        console.log('Transcription failed:', (error as Error).message);
      }
    }
    
    // Combine caption and transcript
    const fullText = [
      metadata.description || metadata.title,
      transcript ? `\n\n[Spoken content]: ${transcript}` : '',
    ].filter(Boolean).join('');
    
    // Generate embed
    const embedCode = generateEmbed('instagram', url);
    
    return {
      platform: 'instagram',
      url,
      title: metadata.title || `${isReel ? 'Reel' : 'Post'} by @${username}`,
      author: username,
      authorUrl: `https://instagram.com/${username}`,
      date: metadata.upload_date ? formatDate(metadata.upload_date) : undefined,
      duration: metadata.duration,
      transcript: fullText || undefined,
      description: metadata.description || metadata.title,
      thumbnailUrl: metadata.thumbnail,
      embedCode,
      raw: {
        postId: metadata.id,
        likes: metadata.like_count,
        comments: metadata.comment_count,
        isReel,
      },
    };
  },
};

/**
 * Fallback extraction via oEmbed API
 */
async function extractViaOEmbed(url: string): Promise<ExtractedContent> {
  try {
    const response = await fetch(
      `https://api.instagram.com/oembed?url=${encodeURIComponent(url)}`
    );
    
    if (!response.ok) {
      throw new Error('Instagram oEmbed API failed');
    }
    
    const data = await response.json() as {
      title?: string;
      author_name?: string;
      author_url?: string;
      thumbnail_url?: string;
    };
    
    const embedCode = generateEmbed('instagram', url);
    
    return {
      platform: 'instagram',
      url,
      title: data.title || 'Instagram Post',
      author: data.author_name || 'unknown',
      authorUrl: data.author_url,
      thumbnailUrl: data.thumbnail_url,
      description: data.title,
      embedCode,
    };
  } catch (error) {
    throw new Error(`Failed to extract Instagram content: ${(error as Error).message}`);
  }
}

interface InstagramMetadata {
  id: string;
  title?: string;
  description?: string;
  uploader?: string;
  channel?: string;
  upload_date?: string;
  duration?: number;
  thumbnail?: string;
  like_count?: number;
  comment_count?: number;
}

/**
 * Format YYYYMMDD to readable date
 */
function formatDate(dateStr: string): string {
  if (dateStr.length !== 8) return dateStr;
  return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
}

export default instagramExtractor;
