# shrd Architecture

## System Overview

```
                                    ┌─────────────────────────────────────┐
                                    │            shrd CLI                 │
                                    │         (main entry point)          │
                                    └─────────────────┬───────────────────┘
                                                      │
                                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              URL Router                                      │
│  Detects platform from URL pattern, routes to appropriate extractor          │
└─────────────────────────────────────────────────────────────────────────────┘
           │              │              │              │              │
           ▼              ▼              ▼              ▼              ▼
    ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐
    │  YouTube  │  │  Article  │  │  Twitter  │  │  Podcast  │  │  TikTok   │
    │ Extractor │  │ Extractor │  │ Extractor │  │ Extractor │  │ Extractor │
    └─────┬─────┘  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘
          │              │              │              │              │
          └──────────────┴──────────────┴──────┬───────┴──────────────┘
                                               │
                                               ▼
                              ┌─────────────────────────────────┐
                              │      Content Normalizer         │
                              │  (unified content structure)    │
                              └─────────────────┬───────────────┘
                                                │
                                                ▼
                              ┌─────────────────────────────────┐
                              │       Blog Generator            │
                              │  (LLM: title, desc, insights)   │
                              └─────────────────┬───────────────┘
                                                │
                                                ▼
                              ┌─────────────────────────────────┐
                              │       Output Formatter          │
                              │  (markdown, HTML, embed codes)  │
                              └─────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Runtime | Node.js 22+ | Consistent with OpenClaw, async-friendly |
| Language | TypeScript | Type safety, better DX |
| CLI Framework | Commander.js | Simple, well-documented |
| Video Extraction | yt-dlp | Best-in-class, supports 1000+ sites |
| Audio Transcription | OpenAI Whisper API | Accurate, fast, cost-effective |
| Article Extraction | @mozilla/readability + jsdom | Industry standard |
| Web Fetching | node-fetch / undici | Built-in, fast |
| LLM | Claude API (via OpenClaw) | Best quality for content generation |
| Output | Custom markdown templates | Simple, flexible |

---

## Module Breakdown

### 1. URL Router (`src/router.ts`)

```typescript
interface RouteResult {
  platform: Platform;
  extractor: Extractor;
  url: string;
  videoId?: string;
}

type Platform = 
  | 'youtube' 
  | 'article' 
  | 'twitter' 
  | 'podcast' 
  | 'tiktok' 
  | 'instagram'
  | 'unknown';

function route(url: string): RouteResult;
```

**URL Pattern Matching:**
- `youtube.com/watch`, `youtu.be/*` → YouTube
- `twitter.com/*/status/*`, `x.com/*/status/*` → Twitter
- `tiktok.com/@*/video/*` → TikTok
- `instagram.com/p/*`, `instagram.com/reel/*` → Instagram
- `*.mp3`, podcast RSS feeds → Podcast
- Everything else → Article (generic web extraction)

### 2. Extractors (`src/extractors/`)

Each extractor implements:

```typescript
interface Extractor {
  extract(url: string): Promise<ExtractedContent>;
}

interface ExtractedContent {
  platform: Platform;
  url: string;
  title: string;
  author: string;
  authorUrl?: string;
  date?: string;
  duration?: number;        // seconds, for audio/video
  transcript?: string;      // full text content
  description?: string;     // original description
  links?: string[];         // extracted URLs
  thumbnailUrl?: string;
  embedCode?: string;       // platform-specific embed HTML
  raw?: any;                // platform-specific metadata
}
```

#### YouTube Extractor
```bash
# Uses yt-dlp with cookies
yt-dlp --cookies ~/.config/yt-dlp/cookies.txt \
  --skip-download \
  --write-auto-sub --sub-lang en \
  --print "%(title)s|||%(channel)s|||%(duration)s|||%(description)s" \
  "$URL"
```

#### Article Extractor
```typescript
// Fetch HTML → Readability → clean text
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';

const dom = new JSDOM(html, { url });
const article = new Readability(dom.window.document).parse();
```

#### Twitter Extractor
```typescript
// Use nitter instances or bird CLI
// Expand threads, get media URLs
```

#### Podcast/Audio Extractor
```typescript
// Download audio → Whisper API
// Support: direct MP3 URLs, Spotify (if possible), RSS feeds
```

#### TikTok/Instagram Extractor
```bash
# yt-dlp works for these too
yt-dlp --skip-download --write-auto-sub "$URL"
# If no subs, download audio → Whisper
```

### 3. Transcription Service (`src/transcribe.ts`)

```typescript
interface TranscribeOptions {
  audioPath?: string;
  audioUrl?: string;
  language?: string;
}

async function transcribe(options: TranscribeOptions): Promise<string> {
  // Use OpenAI Whisper API
  // Handles: file upload, URL fetch, chunking for long audio
}
```

**Whisper API Integration:**
```typescript
const response = await openai.audio.transcriptions.create({
  file: audioFile,
  model: 'whisper-1',
  response_format: 'text'
});
```

### 4. Content Normalizer (`src/normalize.ts`)

Transforms platform-specific `ExtractedContent` into unified `NormalizedContent`:

```typescript
interface NormalizedContent {
  source: {
    platform: Platform;
    url: string;
    title: string;
    author: string;
    date?: string;
  };
  content: {
    text: string;           // main content (transcript or article text)
    wordCount: number;
    readingTime: number;    // minutes
  };
  media: {
    embedCode: string;
    thumbnailUrl?: string;
  };
  metadata: {
    links: string[];
    timestamps?: Timestamp[];
  };
}
```

### 5. Blog Generator (`src/generate.ts`)

Uses LLM to create original content:

```typescript
interface GenerateOptions {
  content: NormalizedContent;
  style?: 'blog' | 'newsletter' | 'tweet-thread' | 'summary';
  tone?: 'professional' | 'casual' | 'analytical';
  perspective?: string;  // e.g., "ad tech executive"
}

interface GeneratedBlog {
  title: string;          // Original, not copied
  description: string;    // 2-3 sentence hot take
  insights: string[];     // 3-5 key points
  quotes: string[];       // Best quotable moments
  embed: string;          // HTML embed code
}
```

**Prompt Structure:**
```
You are a content analyst creating an original blog post based on source material.

SOURCE:
- Platform: {platform}
- Original Title: {title}
- Author: {author}
- Content: {transcript/text}

TASK:
1. Create an ORIGINAL title (do not copy the source title)
2. Write a 2-3 sentence description with YOUR perspective
3. Extract 3-5 key insights (not just summaries - actionable takeaways)
4. Pull 2-3 best quotable moments
5. Note any tools, products, or resources mentioned

OUTPUT FORMAT:
[structured JSON]
```

### 6. Output Formatter (`src/format.ts`)

```typescript
type OutputFormat = 'markdown' | 'html' | 'json';

function format(blog: GeneratedBlog, format: OutputFormat): string;
```

**Embed Code Templates:**

```typescript
const embeds = {
  youtube: (id: string) => 
    `<iframe width="560" height="315" src="https://youtube.com/embed/${id}" frameborder="0" allowfullscreen></iframe>`,
  
  twitter: (url: string) =>
    `<blockquote class="twitter-tweet"><a href="${url}"></a></blockquote>
     <script async src="https://platform.twitter.com/widgets.js"></script>`,
  
  tiktok: (url: string) =>
    `<blockquote class="tiktok-embed" cite="${url}"><a href="${url}"></a></blockquote>
     <script async src="https://www.tiktok.com/embed.js"></script>`,
  
  instagram: (url: string) =>
    `<blockquote class="instagram-media" data-instgrm-permalink="${url}"></blockquote>
     <script async src="//www.instagram.com/embed.js"></script>`,
};
```

---

## File Structure

```
shrd/
├── package.json
├── tsconfig.json
├── README.md
├── bin/
│   └── shrd                    # CLI entry point
├── src/
│   ├── index.ts                # Main exports
│   ├── cli.ts                  # CLI implementation
│   ├── router.ts               # URL routing
│   ├── normalize.ts            # Content normalization
│   ├── generate.ts             # LLM blog generation
│   ├── format.ts               # Output formatting
│   ├── transcribe.ts           # Whisper integration
│   ├── extractors/
│   │   ├── index.ts
│   │   ├── youtube.ts
│   │   ├── article.ts
│   │   ├── twitter.ts
│   │   ├── tiktok.ts
│   │   ├── instagram.ts
│   │   └── podcast.ts
│   ├── embeds/
│   │   └── index.ts            # Embed code generators
│   └── utils/
│       ├── fetch.ts
│       ├── ffmpeg.ts           # Audio extraction
│       └── cache.ts            # Optional caching
├── templates/
│   ├── blog.md.ejs
│   ├── newsletter.md.ejs
│   └── tweet-thread.md.ejs
└── test/
    └── *.test.ts
```

---

## Dependencies

```json
{
  "dependencies": {
    "commander": "^12.0.0",
    "@mozilla/readability": "^0.5.0",
    "jsdom": "^24.0.0",
    "openai": "^4.0.0",
    "node-fetch": "^3.0.0",
    "chalk": "^5.0.0",
    "ora": "^8.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^22.0.0",
    "vitest": "^2.0.0"
  }
}
```

**System Dependencies:**
- `yt-dlp` (already installed at `/usr/local/bin/yt-dlp`)
- `ffmpeg` (for audio extraction)
- YouTube cookies at `~/.config/yt-dlp/cookies.txt`
- OpenAI API key in environment

---

## Configuration

```typescript
// ~/.config/shrd/config.json
{
  "youtube": {
    "cookiesPath": "~/.config/yt-dlp/cookies.txt"
  },
  "whisper": {
    "model": "whisper-1",
    "language": "en"
  },
  "generation": {
    "model": "claude-sonnet-4-5",
    "defaultStyle": "blog",
    "defaultTone": "professional"
  },
  "output": {
    "defaultFormat": "markdown",
    "defaultPath": "~/clawd/shrd-posts/"
  }
}
```

---

## API (for future web version)

```typescript
// POST /api/shrd
{
  "url": "https://youtube.com/watch?v=xxx",
  "style": "blog",
  "tone": "casual"
}

// Response
{
  "success": true,
  "blog": {
    "title": "...",
    "description": "...",
    "insights": [...],
    "quotes": [...],
    "embed": "...",
    "markdown": "..."
  },
  "source": {
    "platform": "youtube",
    "originalTitle": "...",
    "author": "..."
  }
}
```

---

## Error Handling

| Error | Handling |
|-------|----------|
| Unsupported URL | Return helpful message with supported platforms |
| No transcript available | Offer to transcribe with Whisper (costs $) |
| Rate limited | Retry with backoff, use cached if available |
| Private/deleted content | Clear error message |
| Whisper timeout | Chunk audio, retry |

---

## Future Enhancements (v2+)

- **Web UI** at shrd.co with simple paste interface
- **Browser extension** — Right-click any page → "shrd this"
- **Batch processing** — Process multiple URLs from a file
- **Content library** — Store and organize all processed content
- **Style training** — Learn user's writing style for better generation
- **Multi-language** — Whisper supports many languages
- **RSS output** — Auto-generate feed of processed content

---

*Architecture designed: 2026-02-01*
