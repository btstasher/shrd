/**
 * shrd - Embed Code Generators
 * Generate platform-specific embed HTML
 */
/**
 * Generate embed code for a given platform
 */
export function generateEmbed(platform, idOrUrl, options) {
    switch (platform) {
        case 'youtube':
            return generateYouTubeEmbed(idOrUrl);
        case 'twitter':
            return generateTwitterEmbed(idOrUrl);
        case 'tiktok':
            return generateTikTokEmbed(idOrUrl);
        case 'instagram':
            return generateInstagramEmbed(idOrUrl);
        case 'podcast':
            return generatePodcastEmbed(idOrUrl);
        case 'article':
            return generateArticleEmbed(idOrUrl, options);
        default:
            return generateGenericEmbed(idOrUrl);
    }
}
/**
 * YouTube iframe embed
 */
function generateYouTubeEmbed(videoId) {
    return `<iframe 
  width="560" 
  height="315" 
  src="https://www.youtube.com/embed/${videoId}" 
  title="YouTube video player" 
  frameborder="0" 
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
  allowfullscreen>
</iframe>`;
}
/**
 * Twitter/X embed
 */
function generateTwitterEmbed(tweetUrl) {
    return `<blockquote class="twitter-tweet">
  <a href="${tweetUrl}"></a>
</blockquote>
<script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>`;
}
/**
 * TikTok embed
 */
function generateTikTokEmbed(videoUrl) {
    return `<blockquote 
  class="tiktok-embed" 
  cite="${videoUrl}" 
  data-video-id="" 
  style="max-width: 605px; min-width: 325px;">
  <section><a href="${videoUrl}"></a></section>
</blockquote>
<script async src="https://www.tiktok.com/embed.js"></script>`;
}
/**
 * Instagram embed
 */
function generateInstagramEmbed(postUrl) {
    return `<blockquote 
  class="instagram-media" 
  data-instgrm-permalink="${postUrl}" 
  data-instgrm-version="14" 
  style="max-width:540px; min-width:326px; width:calc(100% - 2px);">
  <a href="${postUrl}"></a>
</blockquote>
<script async src="//www.instagram.com/embed.js"></script>`;
}
/**
 * Podcast audio embed
 */
function generatePodcastEmbed(audioUrl) {
    // Check for Spotify
    if (audioUrl.includes('spotify.com')) {
        const embedUrl = audioUrl.replace('open.spotify.com/', 'open.spotify.com/embed/');
        return `<iframe 
  style="border-radius:12px" 
  src="${embedUrl}" 
  width="100%" 
  height="152" 
  frameBorder="0" 
  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
  loading="lazy">
</iframe>`;
    }
    // Check for Apple Podcasts
    if (audioUrl.includes('podcasts.apple.com')) {
        const embedUrl = audioUrl.replace('podcasts.apple.com', 'embed.podcasts.apple.com');
        return `<iframe 
  allow="autoplay *; encrypted-media *; fullscreen *; clipboard-write" 
  frameborder="0" 
  height="175" 
  style="width:100%;max-width:660px;overflow:hidden;border-radius:10px;" 
  sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-top-navigation-by-user-activation" 
  src="${embedUrl}">
</iframe>`;
    }
    // Generic audio player
    return `<audio controls style="width: 100%;">
  <source src="${audioUrl}" type="audio/mpeg">
  Your browser does not support the audio element.
</audio>
<p><a href="${audioUrl}" target="_blank">Download audio</a></p>`;
}
/**
 * Article link card (rich preview style)
 */
function generateArticleEmbed(url, options) {
    const { title, description, image, siteName } = options || {};
    // Generate a nice link card in HTML
    const imageHtml = image
        ? `<img src="${image}" alt="${title || 'Article thumbnail'}" style="width: 100%; max-height: 200px; object-fit: cover;">`
        : '';
    return `<div class="article-embed" style="border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; max-width: 500px; font-family: system-ui, sans-serif;">
  ${imageHtml}
  <div style="padding: 16px;">
    <div style="font-size: 12px; color: #666; margin-bottom: 4px;">${siteName || new URL(url).hostname}</div>
    <a href="${url}" target="_blank" style="font-size: 16px; font-weight: 600; color: #1a1a1a; text-decoration: none; display: block; margin-bottom: 8px;">${title || url}</a>
    ${description ? `<p style="font-size: 14px; color: #666; margin: 0; line-height: 1.4;">${description.slice(0, 150)}${description.length > 150 ? '...' : ''}</p>` : ''}
  </div>
</div>`;
}
/**
 * Generic link embed (fallback)
 */
function generateGenericEmbed(url) {
    return `<a href="${url}" target="_blank">${url}</a>`;
}
/**
 * Generate markdown-compatible embed
 * For platforms that don't have native markdown support
 */
export function generateMarkdownEmbed(platform, idOrUrl) {
    switch (platform) {
        case 'youtube':
            return `[![YouTube Video](https://img.youtube.com/vi/${idOrUrl}/maxresdefault.jpg)](https://www.youtube.com/watch?v=${idOrUrl})`;
        case 'twitter':
            return `[View Tweet](${idOrUrl})`;
        case 'tiktok':
            return `[View TikTok](${idOrUrl})`;
        case 'instagram':
            return `[View on Instagram](${idOrUrl})`;
        default:
            return `[View Source](${idOrUrl})`;
    }
}
//# sourceMappingURL=index.js.map