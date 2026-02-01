/**
 * shrd - Core Types
 */

export type Platform = 
  | 'youtube'
  | 'article'
  | 'twitter'
  | 'tiktok'
  | 'instagram'
  | 'podcast'
  | 'unknown';

export interface Timestamp {
  time: number;      // seconds
  label: string;
}

export interface ExtractedContent {
  platform: Platform;
  url: string;
  title: string;
  author: string;
  authorUrl?: string;
  date?: string;
  duration?: number;           // seconds, for audio/video
  transcript?: string;         // full text content
  description?: string;        // original description
  links?: string[];            // extracted URLs
  timestamps?: Timestamp[];    // chapter markers
  thumbnailUrl?: string;
  embedCode?: string;          // platform-specific embed HTML
  raw?: Record<string, unknown>;  // platform-specific metadata
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
    readingTime: number;       // minutes
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
  title: string;               // Original, not copied
  description: string;         // 2-3 sentence hot take
  insights: string[];          // 3-5 key points
  quotes: string[];            // Best quotable moments
  mentions?: string[];         // Tools, products, people mentioned
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
  id?: string;                 // Video ID, tweet ID, etc.
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
