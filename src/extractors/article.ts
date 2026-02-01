/**
 * shrd - Article Extractor
 * Uses Mozilla Readability to extract clean content from web pages
 */

import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import type { Extractor, ExtractedContent } from '../types.js';
import { generateEmbed } from '../embeds/index.js';

export const articleExtractor: Extractor = {
  name: 'article',
  
  canHandle(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  },
  
  async extract(url: string): Promise<ExtractedContent> {
    // Fetch the page with appropriate headers
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch article: ${response.status} ${response.statusText}`);
    }
    
    const html = await response.text();
    
    // Parse with JSDOM
    const dom = new JSDOM(html, { url });
    const document = dom.window.document;
    
    // Extract metadata from head
    const metaTitle = getMetaContent(document, 'og:title') 
      || getMetaContent(document, 'twitter:title')
      || document.title;
    
    const metaDescription = getMetaContent(document, 'og:description')
      || getMetaContent(document, 'twitter:description')
      || getMetaContent(document, 'description');
    
    const metaAuthor = getMetaContent(document, 'author')
      || getMetaContent(document, 'article:author')
      || extractAuthorFromByline(document);
    
    const metaDate = getMetaContent(document, 'article:published_time')
      || getMetaContent(document, 'date')
      || getMetaContent(document, 'pubdate');
    
    const metaImage = getMetaContent(document, 'og:image')
      || getMetaContent(document, 'twitter:image');
    
    const siteName = getMetaContent(document, 'og:site_name')
      || new URL(url).hostname.replace('www.', '');
    
    // Use Readability to extract main content
    const reader = new Readability(document);
    const article = reader.parse();
    
    if (!article) {
      throw new Error('Could not extract article content. The page may be paywalled or use dynamic loading.');
    }
    
    // Extract links from content
    const links = extractLinks(article.content || '');
    
    // Generate embed code (for articles, it's a link card)
    const embedCode = generateEmbed('article', url, {
      title: article.title || metaTitle,
      description: metaDescription,
      image: metaImage,
      siteName,
    });
    
    return {
      platform: 'article',
      url,
      title: article.title || metaTitle || 'Untitled',
      author: metaAuthor || siteName,
      authorUrl: new URL(url).origin,
      date: metaDate ? formatDate(metaDate) : undefined,
      transcript: article.textContent || undefined,
      description: metaDescription || article.excerpt || undefined,
      links,
      thumbnailUrl: metaImage || undefined,
      embedCode,
      raw: {
        siteName,
        length: article.length,
        excerpt: article.excerpt,
      },
    };
  },
};

/**
 * Get content from meta tag
 */
function getMetaContent(document: Document, name: string): string | undefined {
  // Try property attribute (Open Graph)
  let meta = document.querySelector(`meta[property="${name}"]`);
  if (meta) return meta.getAttribute('content') || undefined;
  
  // Try name attribute
  meta = document.querySelector(`meta[name="${name}"]`);
  if (meta) return meta.getAttribute('content') || undefined;
  
  return undefined;
}

/**
 * Try to extract author from common byline patterns
 */
function extractAuthorFromByline(document: Document): string | undefined {
  const selectors = [
    '.author',
    '.byline',
    '[rel="author"]',
    '.post-author',
    '.article-author',
    '[itemprop="author"]',
  ];
  
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element?.textContent) {
      const text = element.textContent.trim();
      // Clean up common prefixes
      return text.replace(/^by\s+/i, '').trim();
    }
  }
  
  return undefined;
}

/**
 * Extract URLs from HTML content
 */
function extractLinks(html: string): string[] {
  const urlPattern = /href="(https?:\/\/[^"]+)"/g;
  const links: string[] = [];
  let match;
  
  while ((match = urlPattern.exec(html)) !== null) {
    links.push(match[1]);
  }
  
  return [...new Set(links)]; // Dedupe
}

/**
 * Format ISO date to readable format
 */
function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toISOString().split('T')[0];
  } catch {
    return dateStr;
  }
}

export default articleExtractor;
