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

interface RouteParams {
  params: { slug: string };
}

// GET /api/posts/[slug] - Get single post
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const post = await prisma.post.findUnique({
      where: { slug: params.slug },
    });

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    return NextResponse.json(post);
  } catch (error) {
    console.error('Error fetching post:', error);
    return NextResponse.json({ error: 'Failed to fetch post' }, { status: 500 });
  }
}

// PATCH /api/posts/[slug] - Update post
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  if (!authenticate(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await request.json();

    const post = await prisma.post.update({
      where: { slug: params.slug },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.content && { content: data.content }),
        ...(data.excerpt && { excerpt: data.excerpt }),
        ...(data.status && { 
          status: data.status.toUpperCase(),
          ...(data.status.toLowerCase() === 'published' && { publishedAt: new Date() }),
        }),
        ...(data.metaTitle && { metaTitle: data.metaTitle }),
        ...(data.metaDescription && { metaDescription: data.metaDescription }),
      },
    });

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';

    return NextResponse.json({
      id: post.id,
      slug: post.slug,
      url: `${siteUrl}/blog/${post.slug}`,
      status: post.status,
    });
  } catch (error) {
    console.error('Error updating post:', error);
    return NextResponse.json({ error: 'Failed to update post' }, { status: 500 });
  }
}

// DELETE /api/posts/[slug] - Delete post
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  if (!authenticate(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await prisma.post.delete({
      where: { slug: params.slug },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting post:', error);
    return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 });
  }
}
