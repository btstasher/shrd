/**
 * shrd - YouTube Extractor
 * Uses yt-dlp with cookies to extract video metadata and transcripts
 */
import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync, readFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { extractYouTubeId } from '../router.js';
import { generateEmbed } from '../embeds/index.js';
import { extractAudioFromUrl, transcribe } from '../transcribe.js';
const execAsync = promisify(exec);
const YTDLP_PATH = '/usr/local/bin/yt-dlp';
const COOKIES_PATH = `${process.env.HOME}/.config/yt-dlp/cookies.txt`;
const DENO_PATH = `${process.env.HOME}/.deno/bin`;
export const youtubeExtractor = {
    name: 'youtube',
    canHandle(url) {
        return extractYouTubeId(url) !== null;
    },
    async extract(url) {
        const videoId = extractYouTubeId(url);
        if (!videoId) {
            throw new Error(`Invalid YouTube URL: ${url}`);
        }
        // Set up environment with deno path
        const env = {
            ...process.env,
            PATH: `${DENO_PATH}:${process.env.PATH}`,
        };
        // Build yt-dlp command
        const cookieArg = existsSync(COOKIES_PATH) ? `--cookies "${COOKIES_PATH}"` : '';
        // Get metadata as JSON
        const metadataCmd = `${YTDLP_PATH} ${cookieArg} --skip-download -j "${url}"`;
        let metadata;
        try {
            const { stdout } = await execAsync(metadataCmd, { env, maxBuffer: 10 * 1024 * 1024 });
            metadata = JSON.parse(stdout);
        }
        catch (error) {
            throw new Error(`Failed to fetch YouTube metadata: ${error.message}`);
        }
        // Try to get transcript
        let transcript;
        const tempDir = tmpdir();
        const subFile = join(tempDir, `shrd-${videoId}`);
        try {
            // Try manual subs first, then auto-generated
            const subCmd = `${YTDLP_PATH} ${cookieArg} --skip-download --write-sub --write-auto-sub --sub-lang en --sub-format vtt -o "${subFile}" "${url}" 2>/dev/null`;
            await execAsync(subCmd, { env });
            // Find the subtitle file
            const possibleFiles = [
                `${subFile}.en.vtt`,
                `${subFile}.en-US.vtt`,
                `${subFile}.en-GB.vtt`,
            ];
            for (const file of possibleFiles) {
                if (existsSync(file)) {
                    const vttContent = readFileSync(file, 'utf-8');
                    transcript = cleanVttTranscript(vttContent);
                    unlinkSync(file); // Clean up
                    break;
                }
            }
        }
        catch {
            // Transcript not available via captions
        }
        // If no transcript, try Whisper transcription (costs $)
        if (!transcript && process.env.OPENAI_API_KEY) {
            try {
                console.log('No captions available. Attempting Whisper transcription...');
                const audioPath = await extractAudioFromUrl(url);
                const result = await transcribe({ audioPath });
                transcript = result.text;
                // Cleanup audio file
                try {
                    const { unlinkSync } = await import('fs');
                    unlinkSync(audioPath);
                }
                catch { }
            }
            catch (whisperError) {
                console.log('Whisper transcription failed:', whisperError.message);
                // Continue without transcript
            }
        }
        // Extract links from description
        const links = extractLinks(metadata.description || '');
        // Extract timestamps from description
        const timestamps = extractTimestamps(metadata.description || '');
        // Generate embed code
        const embedCode = generateEmbed('youtube', videoId);
        return {
            platform: 'youtube',
            url,
            title: metadata.title,
            author: metadata.channel,
            authorUrl: metadata.channel_url,
            date: formatDate(metadata.upload_date),
            duration: metadata.duration,
            transcript,
            description: metadata.description,
            links,
            timestamps,
            thumbnailUrl: metadata.thumbnail,
            embedCode,
            raw: {
                viewCount: metadata.view_count,
                videoId,
            },
        };
    },
};
/**
 * Clean VTT transcript to plain text
 */
function cleanVttTranscript(vtt) {
    return vtt
        .split('\n')
        .filter(line => {
        // Remove VTT headers and timestamps
        if (line.startsWith('WEBVTT'))
            return false;
        if (line.startsWith('Kind:'))
            return false;
        if (line.startsWith('Language:'))
            return false;
        if (line.includes('-->'))
            return false;
        if (/^\d{2}:\d{2}/.test(line))
            return false;
        if (line.trim() === '')
            return false;
        return true;
    })
        .map(line => line.replace(/<[^>]*>/g, '').trim()) // Remove HTML tags
        .filter((line, index, arr) => line !== arr[index - 1]) // Remove consecutive duplicates
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
}
/**
 * Extract URLs from text
 */
function extractLinks(text) {
    const urlPattern = /https?:\/\/[^\s<>"]+/g;
    const matches = text.match(urlPattern) || [];
    return [...new Set(matches)]; // Dedupe
}
/**
 * Extract timestamps from description
 * Matches patterns like "00:00", "0:00", "1:23:45"
 */
function extractTimestamps(text) {
    const timestamps = [];
    const pattern = /(?:^|\n)\s*(\d{1,2}:)?(\d{1,2}):(\d{2})\s*[-–—]?\s*(.+?)(?=\n|$)/gm;
    let match;
    while ((match = pattern.exec(text)) !== null) {
        const hours = match[1] ? parseInt(match[1].replace(':', ''), 10) : 0;
        const minutes = parseInt(match[2], 10);
        const seconds = parseInt(match[3], 10);
        const label = match[4].trim();
        if (label) {
            timestamps.push({
                time: hours * 3600 + minutes * 60 + seconds,
                label,
            });
        }
    }
    return timestamps;
}
/**
 * Format YYYYMMDD date to readable format
 */
function formatDate(dateStr) {
    if (!dateStr || dateStr.length !== 8)
        return dateStr;
    const year = dateStr.slice(0, 4);
    const month = dateStr.slice(4, 6);
    const day = dateStr.slice(6, 8);
    return `${year}-${month}-${day}`;
}
export default youtubeExtractor;
//# sourceMappingURL=youtube.js.map