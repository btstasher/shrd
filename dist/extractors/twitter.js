/**
 * shrd - Twitter/X Extractor
 * Extracts tweets and threads
 */
import { generateEmbed } from '../embeds/index.js';
// URL patterns
const TWITTER_PATTERNS = [
    /(?:twitter\.com|x\.com)\/(\w+)\/status\/(\d+)/,
];
export const twitterExtractor = {
    name: 'twitter',
    canHandle(url) {
        return TWITTER_PATTERNS.some(pattern => pattern.test(url));
    },
    async extract(url) {
        // Extract tweet ID and username from URL
        const match = url.match(TWITTER_PATTERNS[0]);
        if (!match) {
            throw new Error(`Invalid Twitter URL: ${url}`);
        }
        const [, username, tweetId] = match;
        // Try multiple extraction methods
        let tweetData = null;
        // Method 1: Try Nitter instances (public, no auth needed)
        tweetData = await tryNitterExtraction(username, tweetId);
        // Method 2: Try syndication API (official, limited)
        if (!tweetData) {
            tweetData = await trySyndicationAPI(tweetId);
        }
        // Method 3: Try oEmbed (very limited info)
        if (!tweetData) {
            tweetData = await tryOEmbed(url);
        }
        if (!tweetData) {
            throw new Error('Could not extract tweet. Twitter may be blocking access.');
        }
        // Generate embed
        const embedCode = generateEmbed('twitter', url);
        return {
            platform: 'twitter',
            url,
            title: `Tweet by @${tweetData.author}`,
            author: tweetData.author,
            authorUrl: `https://twitter.com/${tweetData.author}`,
            date: tweetData.date,
            transcript: tweetData.text,
            description: tweetData.text.slice(0, 280),
            links: extractLinks(tweetData.text),
            embedCode,
            raw: {
                tweetId,
                likes: tweetData.likes,
                retweets: tweetData.retweets,
                replies: tweetData.replies,
                isThread: tweetData.isThread,
                threadTexts: tweetData.threadTexts,
            },
        };
    },
};
/**
 * Try extracting via Nitter (privacy-focused Twitter frontend)
 */
async function tryNitterExtraction(username, tweetId) {
    const nitterInstances = [
        'nitter.poast.org',
        'nitter.privacydev.net',
        'nitter.woodland.cafe',
    ];
    for (const instance of nitterInstances) {
        try {
            const response = await fetch(`https://${instance}/${username}/status/${tweetId}`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                },
            });
            if (!response.ok)
                continue;
            const html = await response.text();
            // Parse the tweet content from Nitter HTML
            const textMatch = html.match(/<div class="tweet-content[^"]*"[^>]*>([\s\S]*?)<\/div>/);
            const authorMatch = html.match(/<a class="username"[^>]*>@(\w+)<\/a>/);
            const dateMatch = html.match(/<span class="tweet-date"[^>]*><a[^>]*title="([^"]+)"/);
            if (textMatch) {
                // Clean HTML from text
                const text = textMatch[1]
                    .replace(/<[^>]+>/g, '')
                    .replace(/&amp;/g, '&')
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                    .replace(/&quot;/g, '"')
                    .replace(/&#39;/g, "'")
                    .trim();
                // Check for thread (multiple tweets)
                const threadMatches = html.matchAll(/<div class="tweet-content[^"]*"[^>]*>([\s\S]*?)<\/div>/g);
                const threadTexts = Array.from(threadMatches).map(m => m[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim());
                return {
                    author: authorMatch?.[1] || username,
                    text: threadTexts.length > 1 ? threadTexts.join('\n\n---\n\n') : text,
                    date: dateMatch?.[1],
                    isThread: threadTexts.length > 1,
                    threadTexts: threadTexts.length > 1 ? threadTexts : undefined,
                };
            }
        }
        catch {
            continue;
        }
    }
    return null;
}
/**
 * Try Twitter's syndication API
 */
async function trySyndicationAPI(tweetId) {
    try {
        const response = await fetch(`https://cdn.syndication.twimg.com/tweet-result?id=${tweetId}&lang=en`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            },
        });
        if (!response.ok)
            return null;
        const data = await response.json();
        if (!data.text)
            return null;
        return {
            author: data.user?.screen_name || 'unknown',
            text: data.text,
            date: data.created_at,
            likes: data.favorite_count,
            retweets: data.retweet_count,
            replies: data.reply_count,
        };
    }
    catch {
        return null;
    }
}
/**
 * Try oEmbed API (minimal info)
 */
async function tryOEmbed(url) {
    try {
        const response = await fetch(`https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}`);
        if (!response.ok)
            return null;
        const data = await response.json();
        if (!data.html)
            return null;
        // Extract text from oEmbed HTML
        const textMatch = data.html.match(/<p[^>]*>([\s\S]*?)<\/p>/);
        const text = textMatch?.[1]
            ?.replace(/<[^>]+>/g, '')
            .replace(/&amp;/g, '&')
            .trim() || '';
        return {
            author: data.author_name || 'unknown',
            text,
        };
    }
    catch {
        return null;
    }
}
/**
 * Extract URLs from text
 */
function extractLinks(text) {
    const urlPattern = /https?:\/\/[^\s]+/g;
    const matches = text.match(urlPattern) || [];
    return [...new Set(matches)];
}
export default twitterExtractor;
//# sourceMappingURL=twitter.js.map