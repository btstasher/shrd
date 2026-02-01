import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Auth middleware
function authenticate(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return false;
  
  const token = authHeader.slice(7);
  return token === process.env.SHRD_API_KEY;
}

// Generate slug from title
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100);
}

// GET /api/posts - List posts
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  try {
    const posts = await prisma.post.findMany({
      where: status ? { status: status as any } : undefined,
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 100),
      skip: offset,
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        status: true,
        createdAt: true,
        publishedAt: true,
      },
    });

    return NextResponse.json(posts);
  } catch (error) {
    console.error('Error listing posts:', error);
    return NextResponse.json({ error: 'Failed to list posts' }, { status: 500 });
  }
}

// POST /api/posts - Create post
export async function POST(request: NextRequest) {
  // Require authentication
  if (!authenticate(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await request.json();

    if (!data.title || !data.content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      );
    }

    // Generate unique slug
    let baseSlug = slugify(data.title);
    let slug = baseSlug;
    let counter = 1;

    while (await prisma.post.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter++}`;
    }

    // Create excerpt from content
    const excerpt = data.excerpt || data.content.slice(0, 200).replace(/[#*_`]/g, '') + '...';

    const post = await prisma.post.create({
      data: {
        title: data.title,
        slug,
        content: data.content,
        excerpt,
        status: data.status?.toUpperCase() || 'DRAFT',
        sourceUrl: data.metadata?.source,
        sourcePlatform: data.metadata?.platform,
        metaTitle: data.metaTitle || data.title,
        metaDescription: data.metaDescription || excerpt,
        publishedAt: data.status === 'published' ? new Date() : null,
      },
    });

    // Return the post URL based on the site
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';
    const postUrl = `${siteUrl}/blog/${post.slug}`;

    return NextResponse.json({
      id: post.id,
      slug: post.slug,
      url: postUrl,
      status: post.status,
    });
  } catch (error) {
    console.error('Error creating post:', error);
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
  }
}
