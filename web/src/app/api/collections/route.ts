import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

// GET /api/collections - List collections
export async function GET() {
  try {
    const collections = await prisma.collection.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { drafts: true },
        },
      },
    });

    return NextResponse.json(collections);
  } catch (error) {
    console.error('Error fetching collections:', error);
    return NextResponse.json({ error: 'Failed to fetch collections' }, { status: 500 });
  }
}

// POST /api/collections - Create collection
export async function POST(request: NextRequest) {
  try {
    const { name, slug, description } = await request.json();

    if (!name || !slug) {
      return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 });
    }

    const collection = await prisma.collection.create({
      data: {
        name,
        slug,
        description,
      },
    });

    return NextResponse.json(collection);
  } catch (error) {
    console.error('Error creating collection:', error);
    return NextResponse.json({ error: 'Failed to create collection' }, { status: 500 });
  }
}
