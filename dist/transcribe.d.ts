/**
 * shrd - Whisper Transcription Service
 * Uses OpenAI Whisper API to transcribe audio content
 */
export interface TranscribeOptions {
    audioPath?: string;
    audioUrl?: string;
    language?: string;
    model?: string;
}
export interface TranscribeResult {
    text: string;
    duration?: number;
    language?: string;
}
/**
 * Transcribe audio using OpenAI Whisper API
 */
export declare function transcribe(options: TranscribeOptions): Promise<TranscribeResult>;
/**
 * Extract audio from video file using ffmpeg
 */
export declare function extractAudio(videoPath: string): Promise<string>;
/**
 * Extract audio from video URL using yt-dlp
 */
export declare function extractAudioFromUrl(url: string): Promise<string>;
/**
 * Check if ffmpeg is available
 */
export declare function checkFfmpeg(): Promise<boolean>;
/**
 * Get audio duration using ffprobe
 */
export declare function getAudioDuration(filePath: string): Promise<number>;
//# sourceMappingURL=transcribe.d.ts.map