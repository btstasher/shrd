/**
 * shrd - TikTok Extractor
 * Uses yt-dlp for metadata and Whisper for transcription
 */
import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomBytes } from 'crypto';
import { generateEmbed } from '../embeds/index.js';
import { transcribe } from '../transcribe.js';
const execAsync = promisify(exec);
const YTDLP_PATH = '/usr/local/bin/yt-dlp';
// URL patterns
const TIKTOK_PATTERNS = [
    /tiktok\.com\/@([\w.-]+)\/video\/(\d+)/,
    /tiktok\.com\/t\/(\w+)/,
    /vm\.tiktok\.com\/(\w+)/,
];
export const tiktokExtractor = {
    name: 'tiktok',
    canHandle(url) {
        return TIKTOK_PATTERNS.some(pattern => pattern.test(url));
    },
    async extract(url) {
        const env = {
            ...process.env,
            PATH: `${process.env.HOME}/.deno/bin:${process.env.PATH}`,
        };
        // Get metadata via yt-dlp
        let metadata;
        try {
            const { stdout } = await execAsync(`${YTDLP_PATH} --skip-download -j "${url}" 2>/dev/null`, { env });
            metadata = JSON.parse(stdout);
        }
        catch (error) {
            throw new Error(`Failed to fetch TikTok metadata: ${error.message}`);
        }
        // Extract username from URL or metadata
        const urlMatch = url.match(TIKTOK_PATTERNS[0]);
        const username = urlMatch?.[1] || metadata.uploader || metadata.creator || 'unknown';
        // Get transcript via Whisper if OpenAI key available
        let transcript;
        if (process.env.OPENAI_API_KEY) {
            const audioPath = join(tmpdir(), `shrd-tiktok-${randomBytes(4).toString('hex')}`);
            try {
                console.log('Downloading TikTok audio...');
                await execAsync(`${YTDLP_PATH} -x --audio-format mp3 --audio-quality 128K -o "${audioPath}.%(ext)s" "${url}" 2>/dev/null`, { env });
                // Find the downloaded file
                const { stdout: files } = await execAsync(`ls -1 "${audioPath}".* 2>/dev/null || true`);
                const audioFile = files.trim().split('\n')[0];
                if (audioFile && existsSync(audioFile)) {
                    console.log('Transcribing TikTok audio...');
                    const result = await transcribe({ audioPath: audioFile });
                    transcript = result.text;
                    // Cleanup
                    unlinkSync(audioFile);
                }
            }
            catch (error) {
                console.log('Transcription failed:', error.message);
                // Continue without transcript
            }
        }
        // Combine caption and transcript
        const fullText = [
            metadata.description || metadata.title,
            transcript ? `\n\n[Spoken content]: ${transcript}` : '',
        ].filter(Boolean).join('');
        // Generate embed
        const embedCode = generateEmbed('tiktok', url);
        return {
            platform: 'tiktok',
            url,
            title: metadata.title || `TikTok by @${username}`,
            author: username,
            authorUrl: `https://tiktok.com/@${username}`,
            date: metadata.upload_date ? formatDate(metadata.upload_date) : undefined,
            duration: metadata.duration,
            transcript: fullText || undefined,
            description: metadata.description || metadata.title,
            thumbnailUrl: metadata.thumbnail,
            embedCode,
            raw: {
                videoId: metadata.id,
                likes: metadata.like_count,
                comments: metadata.comment_count,
                shares: metadata.repost_count,
                views: metadata.view_count,
            },
        };
    },
};
/**
 * Format YYYYMMDD to readable date
 */
function formatDate(dateStr) {
    if (dateStr.length !== 8)
        return dateStr;
    return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
}
export default tiktokExtractor;
//# sourceMappingURL=tiktok.js.map