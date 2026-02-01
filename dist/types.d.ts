/**
 * shrd - Core Types
 */
export type Platform = 'youtube' | 'article' | 'twitter' | 'tiktok' | 'instagram' | 'podcast' | 'unknown';
export interface Timestamp {
    time: number;
    label: string;
}
export interface ExtractedContent {
    platform: Platform;
    url: string;
    title: string;
    author: string;
    authorUrl?: string;
    date?: string;
    duration?: number;
    transcript?: string;
    description?: string;
    links?: string[];
    timestamps?: Timestamp[];
    thumbnailUrl?: string;
    embedCode?: string;
    raw?: Record<string, unknown>;
}
export interface NormalizedContent {
    source: {
        platform: Platform;
        url: string;
        title: string;
        author: string;
        authorUrl?: string;
        date?: string;
    };
    content: {
        text: string;
        wordCount: number;
        readingTime: number;
    };
    media: {
        embedCode: string;
        thumbnailUrl?: string;
    };
    metadata: {
        links: string[];
        timestamps: Timestamp[];
        duration?: number;
    };
}
export interface GeneratedBlog {
    title: string;
    description: string;
    insights: string[];
    quotes: string[];
    mentions?: string[];
}
export interface ShrdOutput {
    blog: GeneratedBlog;
    source: NormalizedContent['source'];
    embed: string;
    markdown: string;
}
export interface ShrdConfig {
    youtube?: {
        cookiesPath?: string;
    };
    whisper?: {
        model?: string;
        language?: string;
    };
    generation?: {
        model?: string;
        defaultStyle?: OutputStyle;
        defaultTone?: OutputTone;
    };
    output?: {
        defaultFormat?: OutputFormat;
        defaultPath?: string;
    };
}
export type OutputStyle = 'blog' | 'newsletter' | 'tweet-thread' | 'summary';
export type OutputTone = 'professional' | 'casual' | 'analytical';
export type OutputFormat = 'markdown' | 'html' | 'json';
export interface RouteResult {
    platform: Platform;
    url: string;
    id?: string;
}
export interface Extractor {
    name: Platform;
    canHandle(url: string): boolean;
    extract(url: string): Promise<ExtractedContent>;
}
export interface GenerateOptions {
    style?: OutputStyle;
    tone?: OutputTone;
    perspective?: string;
}
export interface CliOptions {
    output?: string;
    format?: OutputFormat;
    style?: OutputStyle;
    extractOnly?: boolean;
    verbose?: boolean;
}
//# sourceMappingURL=types.d.ts.map