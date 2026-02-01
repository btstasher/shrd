/**
 * shrd - Blog Generator
 * Uses LLM to generate original blog content from source material
 * Prefers OpenClaw gateway (Sonnet), falls back to direct API calls
 */
import { truncateContent } from './normalize.js';
import { generateViaGateway, isGatewayAvailable } from './gateway.js';
// Maximum content length to send to LLM (roughly 100k tokens worth)
const MAX_CONTENT_LENGTH = 400000;
/**
 * Generate a blog post from normalized content
 * Tries OpenClaw gateway first, falls back to direct API
 */
export async function generate(content, options = {}) {
    // Try OpenClaw gateway first (uses Sonnet, your subscription)
    if (await isGatewayAvailable()) {
        try {
            console.log('Using OpenClaw gateway (Claude Sonnet)...');
            return await generateViaGateway(content, options);
        }
        catch (error) {
            console.log('Gateway failed, falling back to direct API:', error.message);
        }
    }
    // Fallback to direct API calls
    const { style = 'blog', tone = 'professional', perspective } = options;
    // Prepare content for LLM (truncate if needed)
    const sourceText = truncateContent(content.content.text, MAX_CONTENT_LENGTH);
    // Build the prompt
    const prompt = buildPrompt(content, sourceText, { style, tone, perspective });
    // Call API via environment
    const response = await callLLM(prompt);
    // Parse the response
    return parseResponse(response);
}
/**
 * Build the generation prompt
 */
function buildPrompt(content, sourceText, options) {
    const { style, tone, perspective } = options;
    const perspectiveInstruction = perspective
        ? `Write from the perspective of ${perspective}.`
        : '';
    const timestamps = content.metadata.timestamps.length > 0
        ? `\nTIMESTAMPS:\n${content.metadata.timestamps.map(t => `${formatTime(t.time)} - ${t.label}`).join('\n')}`
        : '';
    return `You are a content analyst creating an original ${style} post based on source material.

SOURCE INFORMATION:
- Platform: ${content.source.platform}
- Original Title: "${content.source.title}"
- Author: ${content.source.author}
- Date: ${content.source.date || 'Unknown'}
- Reading/Watch Time: ${content.content.readingTime} minutes
${timestamps}

CONTENT:
${sourceText}

TASK:
Create an ORIGINAL blog post based on this content. ${perspectiveInstruction}

REQUIREMENTS:
1. TITLE: Create an original, compelling title (DO NOT copy the source title verbatim)
2. DESCRIPTION: Write 2-3 sentences that capture YOUR perspective/hot take on the content
3. INSIGHTS: Extract 3-5 key insights (not just summaries - actionable takeaways)
4. QUOTES: Pull 2-3 of the best quotable moments (exact quotes from the content)
5. MENTIONS: List any tools, products, companies, or notable people mentioned

TONE: ${tone}
STYLE: ${style}

OUTPUT FORMAT (respond with valid JSON only):
{
  "title": "Your original title here",
  "description": "Your 2-3 sentence description with perspective",
  "insights": [
    "First key insight",
    "Second key insight",
    "Third key insight"
  ],
  "quotes": [
    "Exact quote from the content",
    "Another notable quote"
  ],
  "mentions": ["Tool1", "Company2", "Person3"]
}

Respond with ONLY the JSON object, no additional text.`;
}
/**
 * Call the LLM API
 * Uses OpenAI-compatible API via environment
 */
async function callLLM(prompt) {
    const apiKey = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        throw new Error('No API key found. Set OPENAI_API_KEY or ANTHROPIC_API_KEY environment variable.');
    }
    // Determine which API to use based on the key prefix
    const isAnthropic = apiKey.startsWith('sk-ant-');
    if (isAnthropic) {
        return callAnthropic(prompt, apiKey);
    }
    else {
        return callOpenAI(prompt, apiKey);
    }
}
/**
 * Call Anthropic Claude API
 */
async function callAnthropic(prompt, apiKey) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 4096,
            messages: [
                { role: 'user', content: prompt }
            ],
        }),
    });
    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Anthropic API error: ${response.status} - ${error}`);
    }
    const data = await response.json();
    return data.content[0]?.text || '';
}
/**
 * Call OpenAI API
 */
async function callOpenAI(prompt, apiKey) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: 'gpt-4o',
            messages: [
                { role: 'user', content: prompt }
            ],
            temperature: 0.7,
        }),
    });
    if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }
    const data = await response.json();
    return data.choices[0]?.message?.content || '';
}
/**
 * Parse LLM response into structured blog content
 */
function parseResponse(response) {
    try {
        // Try to extract JSON from the response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('No JSON found in response');
        }
        const parsed = JSON.parse(jsonMatch[0]);
        return {
            title: parsed.title || 'Untitled',
            description: parsed.description || '',
            insights: Array.isArray(parsed.insights) ? parsed.insights : [],
            quotes: Array.isArray(parsed.quotes) ? parsed.quotes : [],
            mentions: Array.isArray(parsed.mentions) ? parsed.mentions : [],
        };
    }
    catch (error) {
        throw new Error(`Failed to parse LLM response: ${error.message}`);
    }
}
/**
 * Format seconds to timestamp string
 */
function formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
        return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
}
//# sourceMappingURL=generate.js.map