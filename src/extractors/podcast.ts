/**
 * shrd - Podcast Extractor
 * Handles direct audio URLs and podcast feeds
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomBytes } from 'crypto';
import type { Extractor, ExtractedContent } from '../types.js';
import { generateEmbed } from '../embeds/index.js';
import { transcribe, getAudioDuration } from '../transcribe.js';

const execAsync = promisify(exec);

// URL patterns for podcast detection
const PODCAST_PATTERNS = [
  /\.mp3(?:\?|$)/i,
  /\.m4a(?:\?|$)/i,
  /\.wav(?:\?|$)/i,
  /anchor\.fm/,
  /podcasts\.apple\.com/,
  /open\.spotify\.com\/episode/,
  /soundcloud\.com/,
  /overcast\.fm/,
  /pocketcasts\.com/,
];

export const podcastExtractor: Extractor = {
  name: 'podcast',
  
  canHandle(url: string): boolean {
    return PODCAST_PATTERNS.some(pattern => pattern.test(url));
  },
  
  async extract(url: string): Promise<ExtractedContent> {
    // Determine extraction method based on URL type
    if (isDirectAudioUrl(url)) {
      return extractDirectAudio(url);
    }
    
    if (url.includes('spotify.com')) {
      return extractSpotify(url);
    }
    
    // Try generic extraction (yt-dlp supports many podcast platforms)
    return extractGenericPodcast(url);
  },
};

/**
 * Check if URL is a direct audio file
 */
function isDirectAudioUrl(url: string): boolean {
  return /\.(mp3|m4a|wav|ogg|opus)(\?|$)/i.test(url);
}

/**
 * Extract from direct audio URL
 */
async function extractDirectAudio(url: string): Promise<ExtractedContent> {
  const tempPath = join(tmpdir(), `shrd-podcast-${randomBytes(4).toString('hex')}.mp3`);
  
  try {
    // Download the audio file
    console.log('Downloading audio...');
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to download audio: ${response.status}`);
    }
    
    const buffer = await response.arrayBuffer();
    await import('fs').then(fs => fs.promises.writeFile(tempPath, Buffer.from(buffer)));
    
    // Get duration
    const duration = await getAudioDuration(tempPath);
    
    // Transcribe
    console.log('Transcribing audio (this may take a while for long podcasts)...');
    const result = await transcribe({ audioPath: tempPath });
    
    // Try to extract title from URL
    const urlParts = new URL(url);
    const filename = urlParts.pathname.split('/').pop() || 'podcast';
    const title = decodeURIComponent(filename.replace(/\.(mp3|m4a|wav)$/i, '').replace(/[-_]/g, ' '));
    
    return {
      platform: 'podcast',
      url,
      title: title || 'Podcast Episode',
      author: urlParts.hostname,
      duration: Math.round(duration),
      transcript: result.text,
      embedCode: generateEmbed('podcast', url),
    };
    
  } finally {
    // Cleanup
    if (existsSync(tempPath)) {
      unlinkSync(tempPath);
    }
  }
}

/**
 * Extract from Spotify podcast (limited - may need API)
 */
async function extractSpotify(url: string): Promise<ExtractedContent> {
  // Spotify doesn't allow direct audio download without API
  // Try to get metadata at least
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    },
  });
  
  const html = await response.text();
  
  // Extract metadata from page
  const titleMatch = html.match(/<title>([^<]+)<\/title>/);
  const title = titleMatch?.[1]?.replace(' | Podcast on Spotify', '').trim() || 'Spotify Podcast';
  
  const descMatch = html.match(/<meta name="description" content="([^"]+)"/);
  const description = descMatch?.[1] || '';
  
  // Cannot transcribe Spotify without premium API access
  return {
    platform: 'podcast',
    url,
    title,
    author: 'Spotify',
    description,
    transcript: undefined, // Would need Spotify API for audio access
    embedCode: generateSpotifyEmbed(url),
  };
}

/**
 * Extract using yt-dlp (supports many platforms)
 */
async function extractGenericPodcast(url: string): Promise<ExtractedContent> {
  const tempAudio = join(tmpdir(), `shrd-podcast-${randomBytes(4).toString('hex')}`);
  const cookiesPath = `${process.env.HOME}/.config/yt-dlp/cookies.txt`;
  const cookieArg = existsSync(cookiesPath) ? `--cookies "${cookiesPath}"` : '';
  
  try {
    // Try to get metadata first
    let metadata: { title: string; uploader: string; duration: number; description?: string };
    
    try {
      const { stdout } = await execAsync(
        `/usr/local/bin/yt-dlp ${cookieArg} --skip-download -j "${url}" 2>/dev/null`,
        { env: { ...process.env, PATH: `${process.env.HOME}/.deno/bin:${process.env.PATH}` } }
      );
      metadata = JSON.parse(stdout);
    } catch {
      metadata = { title: 'Podcast', uploader: 'Unknown', duration: 0 };
    }
    
    // Download audio
    console.log('Downloading podcast audio...');
    await execAsync(
      `/usr/local/bin/yt-dlp ${cookieArg} -x --audio-format mp3 --audio-quality 128K -o "${tempAudio}.%(ext)s" "${url}" 2>/dev/null`,
      { env: { ...process.env, PATH: `${process.env.HOME}/.deno/bin:${process.env.PATH}` } }
    );
    
    // Find the downloaded file
    const { stdout: files } = await execAsync(`ls -1 "${tempAudio}".* 2>/dev/null || true`);
    const audioFile = files.trim().split('\n')[0];
    
    if (!audioFile || !existsSync(audioFile)) {
      throw new Error('Failed to download podcast audio');
    }
    
    // Transcribe
    console.log('Transcribing podcast...');
    const result = await transcribe({ audioPath: audioFile });
    
    // Cleanup
    unlinkSync(audioFile);
    
    return {
      platform: 'podcast',
      url,
      title: metadata.title || 'Podcast Episode',
      author: metadata.uploader || 'Unknown',
      duration: metadata.duration || 0,
      description: metadata.description,
      transcript: result.text,
      embedCode: generateEmbed('podcast', url),
    };
    
  } catch (error) {
    // Cleanup on error
    await execAsync(`rm -f "${tempAudio}".*`).catch(() => {});
    throw error;
  }
}

/**
 * Generate Spotify embed code
 */
function generateSpotifyEmbed(url: string): string {
  // Convert URL to embed URL
  // https://open.spotify.com/episode/xxx -> https://open.spotify.com/embed/episode/xxx
  const embedUrl = url.replace('open.spotify.com/', 'open.spotify.com/embed/');
  
  return `<iframe 
  style="border-radius:12px" 
  src="${embedUrl}" 
  width="100%" 
  height="352" 
  frameBorder="0" 
  allowfullscreen="" 
  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
  loading="lazy">
</iframe>`;
}

export default podcastExtractor;
