/**
 * shrd - Whisper Transcription Service
 * Uses OpenAI Whisper API to transcribe audio content
 */
import { existsSync, statSync, unlinkSync } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomBytes } from 'crypto';
const execAsync = promisify(exec);
// Whisper API limits
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const SUPPORTED_FORMATS = ['mp3', 'mp4', 'mpeg', 'mpga', 'm4a', 'wav', 'webm'];
/**
 * Transcribe audio using OpenAI Whisper API
 */
export async function transcribe(options) {
    const { audioPath, audioUrl, language = 'en', model = 'whisper-1' } = options;
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error('OPENAI_API_KEY environment variable is required for transcription');
    }
    let filePath;
    let shouldCleanup = false;
    // Get the audio file
    if (audioPath) {
        filePath = audioPath;
    }
    else if (audioUrl) {
        filePath = await downloadAudio(audioUrl);
        shouldCleanup = true;
    }
    else {
        throw new Error('Either audioPath or audioUrl must be provided');
    }
    try {
        // Check file exists
        if (!existsSync(filePath)) {
            throw new Error(`Audio file not found: ${filePath}`);
        }
        // Check file size
        const stats = statSync(filePath);
        if (stats.size > MAX_FILE_SIZE) {
            // Need to chunk the file
            return await transcribeChunked(filePath, { language, model, apiKey });
        }
        // Single file transcription
        return await transcribeFile(filePath, { language, model, apiKey });
    }
    finally {
        // Cleanup temp files
        if (shouldCleanup && existsSync(filePath)) {
            unlinkSync(filePath);
        }
    }
}
/**
 * Transcribe a single audio file
 */
async function transcribeFile(filePath, options) {
    const { language, model, apiKey } = options;
    // Use FormData for multipart upload
    const formData = new FormData();
    // Read file as blob
    const fileBuffer = await import('fs').then(fs => fs.promises.readFile(filePath));
    const blob = new Blob([fileBuffer]);
    formData.append('file', blob, 'audio.mp3');
    formData.append('model', model);
    formData.append('language', language);
    formData.append('response_format', 'verbose_json');
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
        },
        body: formData,
    });
    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Whisper API error: ${response.status} - ${error}`);
    }
    const data = await response.json();
    return {
        text: data.text,
        duration: data.duration,
        language: data.language,
    };
}
/**
 * Transcribe a large audio file by chunking
 */
async function transcribeChunked(filePath, options) {
    const chunkDir = join(tmpdir(), `shrd-chunks-${randomBytes(4).toString('hex')}`);
    try {
        // Create chunk directory
        await execAsync(`mkdir -p "${chunkDir}"`);
        // Split audio into 10-minute chunks using ffmpeg
        // 10 minutes at 128kbps ≈ 10MB, well under 25MB limit
        const chunkPattern = join(chunkDir, 'chunk_%03d.mp3');
        await execAsync(`ffmpeg -i "${filePath}" -f segment -segment_time 600 -c:a libmp3lame -b:a 128k "${chunkPattern}" 2>/dev/null`);
        // Get list of chunks
        const { stdout } = await execAsync(`ls -1 "${chunkDir}"/chunk_*.mp3 | sort`);
        const chunks = stdout.trim().split('\n').filter(Boolean);
        if (chunks.length === 0) {
            throw new Error('Failed to split audio into chunks');
        }
        // Transcribe each chunk
        const transcripts = [];
        let totalDuration = 0;
        for (const chunk of chunks) {
            const result = await transcribeFile(chunk, options);
            transcripts.push(result.text);
            if (result.duration) {
                totalDuration += result.duration;
            }
        }
        return {
            text: transcripts.join(' '),
            duration: totalDuration,
            language: options.language,
        };
    }
    finally {
        // Cleanup chunk directory
        await execAsync(`rm -rf "${chunkDir}"`).catch(() => { });
    }
}
/**
 * Download audio from URL to temp file
 */
async function downloadAudio(url) {
    const tempPath = join(tmpdir(), `shrd-audio-${randomBytes(4).toString('hex')}.mp3`);
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to download audio: ${response.status}`);
    }
    const buffer = await response.arrayBuffer();
    await import('fs').then(fs => fs.promises.writeFile(tempPath, Buffer.from(buffer)));
    return tempPath;
}
/**
 * Extract audio from video file using ffmpeg
 */
export async function extractAudio(videoPath) {
    const audioPath = join(tmpdir(), `shrd-extracted-${randomBytes(4).toString('hex')}.mp3`);
    try {
        await execAsync(`ffmpeg -i "${videoPath}" -vn -acodec libmp3lame -b:a 128k "${audioPath}" 2>/dev/null`);
        return audioPath;
    }
    catch (error) {
        throw new Error(`Failed to extract audio: ${error.message}`);
    }
}
/**
 * Extract audio from video URL using yt-dlp
 */
export async function extractAudioFromUrl(url) {
    const audioPath = join(tmpdir(), `shrd-ytaudio-${randomBytes(4).toString('hex')}.mp3`);
    const cookiesPath = `${process.env.HOME}/.config/yt-dlp/cookies.txt`;
    const cookieArg = existsSync(cookiesPath) ? `--cookies "${cookiesPath}"` : '';
    try {
        await execAsync(`/usr/local/bin/yt-dlp ${cookieArg} -x --audio-format mp3 --audio-quality 128K -o "${audioPath}" "${url}" 2>/dev/null`, { env: { ...process.env, PATH: `${process.env.HOME}/.deno/bin:${process.env.PATH}` } });
        // yt-dlp might add extension, check for both
        if (existsSync(audioPath))
            return audioPath;
        if (existsSync(audioPath + '.mp3'))
            return audioPath + '.mp3';
        throw new Error('Audio file not created');
    }
    catch (error) {
        throw new Error(`Failed to extract audio from URL: ${error.message}`);
    }
}
/**
 * Check if ffmpeg is available
 */
export async function checkFfmpeg() {
    try {
        await execAsync('which ffmpeg');
        return true;
    }
    catch {
        return false;
    }
}
/**
 * Get audio duration using ffprobe
 */
export async function getAudioDuration(filePath) {
    try {
        const { stdout } = await execAsync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`);
        return parseFloat(stdout.trim());
    }
    catch {
        return 0;
    }
}
//# sourceMappingURL=transcribe.js.map