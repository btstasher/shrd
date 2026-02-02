import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

// GET /api/drafts - List drafts
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const targetSite = searchParams.get('site');
  const status = searchParams.get('status');
  const includeArchived = searchParams.get('includeArchived') === 'true';
  const includeCollections = searchParams.get('includeCollections') === 'true';

  try {
    const drafts = await prisma.draft.findMany({
      where: {
        ...(targetSite && { targetSite }),
        ...(status && { status: status as any }),
        ...(!includeArchived && !status && { status: { not: 'ARCHIVED' } }),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
      ...(includeCollections && {
        include: {
          collections: {
            include: {
              collection: {
                select: { id: true, name: true },
              },
            },
          },
        },
      }),
    });

    return NextResponse.json(drafts);
  } catch (error) {
    console.error('Error fetching drafts:', error);
    return NextResponse.json({ error: 'Failed to fetch drafts' }, { status: 500 });
  }
}

// POST /api/drafts - Create draft
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    const draft = await prisma.draft.create({
      data: {
        sourceUrl: data.source.url,
        platform: data.source.platform,
        sourceTitle: data.source.title,
        sourceAuthor: data.source.author,
        title: data.blog.title,
        description: data.blog.description,
        insights: data.blog.insights || [],
        quotes: data.blog.quotes || [],
        mentions: data.blog.mentions || [],
        markdown: data.markdown,
        embedCode: data.embed,
        targetSite: data.targetSite || 'shrd',
      },
    });

    return NextResponse.json(draft);
  } catch (error) {
    console.error('Error creating draft:', error);
    return NextResponse.json({ error: 'Failed to create draft' }, { status: 500 });
  }
}
