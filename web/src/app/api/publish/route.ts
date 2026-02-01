import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

// Site-specific publish configurations
const SITE_CONFIGS: Record<string, { apiUrl?: string; apiKey?: string }> = {
  shrd: {},
  hrvstr: {
    apiUrl: process.env.HRVSTR_API_URL,
    apiKey: process.env.HRVSTR_API_KEY,
  },
  tpl: {
    apiUrl: process.env.TPL_API_URL,
    apiKey: process.env.TPL_API_KEY,
  },
  tplgolf: {
    apiUrl: process.env.TPLGOLF_API_URL,
    apiKey: process.env.TPLGOLF_API_KEY,
  },
};

// POST /api/publish - Publish a draft
export async function POST(request: NextRequest) {
  try {
    const { draftId, targetSite } = await request.json();

    if (!draftId) {
      return NextResponse.json({ error: 'Draft ID is required' }, { status: 400 });
    }

    // Get the draft
    const draft = await prisma.draft.findUnique({
      where: { id: draftId },
    });

    if (!draft) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
    }

    const site = targetSite || draft.targetSite;
    const config = SITE_CONFIGS[site];

    if (!config) {
      return NextResponse.json({ error: 'Unknown target site' }, { status: 400 });
    }

    let publishedUrl: string;

    // Site-specific publishing logic
    switch (site) {
      case 'hrvstr':
        publishedUrl = await publishToHrvstr(draft, config);
        break;
      case 'tpl':
        publishedUrl = await publishToTPL(draft, config);
        break;
      case 'tplgolf':
        publishedUrl = await publishToTPLGolf(draft, config);
        break;
      default:
        // For shrd.co, just mark as published
        publishedUrl = `https://shrd.co/posts/${draft.id}`;
    }

    // Update draft status
    await prisma.draft.update({
      where: { id: draftId },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
        publishedUrl,
      },
    });

    return NextResponse.json({ success: true, url: publishedUrl });
  } catch (error) {
    console.error('Publish error:', error);
    return NextResponse.json(
      { error: `Publishing failed: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}

// Site-specific publish functions
async function publishToHrvstr(draft: any, config: any): Promise<string> {
  if (!config.apiUrl || !config.apiKey) {
    throw new Error('HRVSTR API not configured');
  }

  const response = await fetch(`${config.apiUrl}/api/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      title: draft.title,
      content: draft.markdown,
      status: 'draft', // Let them review before publishing
      metadata: {
        source: draft.sourceUrl,
        platform: draft.platform,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`HRVSTR API error: ${response.status}`);
  }

  const result = await response.json();
  return result.url || `https://hrvstr.com/blog/${result.slug}`;
}

async function publishToTPL(draft: any, config: any): Promise<string> {
  if (!config.apiUrl || !config.apiKey) {
    throw new Error('TPL API not configured');
  }

  const response = await fetch(`${config.apiUrl}/api/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      title: draft.title,
      content: draft.markdown,
      status: 'draft',
    }),
  });

  if (!response.ok) {
    throw new Error(`TPL API error: ${response.status}`);
  }

  const result = await response.json();
  return result.url || `https://theperfectlie.net/posts/${result.slug}`;
}

async function publishToTPLGolf(draft: any, config: any): Promise<string> {
  if (!config.apiUrl || !config.apiKey) {
    throw new Error('TPL Golf API not configured');
  }

  const response = await fetch(`${config.apiUrl}/api/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      title: draft.title,
      content: draft.markdown,
      status: 'draft',
    }),
  });

  if (!response.ok) {
    throw new Error(`TPL Golf API error: ${response.status}`);
  }

  const result = await response.json();
  return result.url || `https://tplgolf.com/posts/${result.slug}`;
}
