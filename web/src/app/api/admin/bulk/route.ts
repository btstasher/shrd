import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

interface BulkRequest {
  action: 'archive' | 'hide' | 'show' | 'assignCollection' | 'removeFromCollection' | 'delete';
  type: 'posts' | 'collections';
  ids: string[];
  collectionId?: string;
}

// POST /api/admin/bulk - Bulk actions
export async function POST(request: NextRequest) {
  try {
    const { action, type, ids, collectionId }: BulkRequest = await request.json();

    if (!action || !type || !ids || ids.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let result;

    switch (action) {
      case 'archive':
        if (type !== 'posts') {
          return NextResponse.json({ error: 'Archive only applies to posts' }, { status: 400 });
        }
        result = await prisma.draft.updateMany({
          where: { id: { in: ids } },
          data: { status: 'ARCHIVED' },
        });
        break;

      case 'hide':
        if (type === 'posts') {
          result = await prisma.draft.updateMany({
            where: { id: { in: ids } },
            data: { hidden: true },
          });
        } else {
          result = await prisma.collection.updateMany({
            where: { id: { in: ids } },
            data: { hidden: true },
          });
        }
        break;

      case 'show':
        if (type === 'posts') {
          result = await prisma.draft.updateMany({
            where: { id: { in: ids } },
            data: { hidden: false },
          });
        } else {
          result = await prisma.collection.updateMany({
            where: { id: { in: ids } },
            data: { hidden: false },
          });
        }
        break;

      case 'assignCollection':
        if (type !== 'posts' || !collectionId) {
          return NextResponse.json({ error: 'Collection ID required for assignment' }, { status: 400 });
        }
        // Use createMany with skipDuplicates to avoid errors on existing relationships
        result = await prisma.draftCollection.createMany({
          data: ids.map(draftId => ({
            draftId,
            collectionId,
          })),
          skipDuplicates: true,
        });
        break;

      case 'removeFromCollection':
        if (type !== 'posts' || !collectionId) {
          return NextResponse.json({ error: 'Collection ID required for removal' }, { status: 400 });
        }
        result = await prisma.draftCollection.deleteMany({
          where: {
            draftId: { in: ids },
            collectionId,
          },
        });
        break;

      case 'delete':
        if (type === 'collections') {
          result = await prisma.collection.deleteMany({
            where: { id: { in: ids } },
          });
        } else {
          result = await prisma.draft.deleteMany({
            where: { id: { in: ids } },
          });
        }
        break;

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }

    return NextResponse.json({ success: true, count: result.count });
  } catch (error) {
    console.error('Bulk action error:', error);
    return NextResponse.json({ error: 'Bulk action failed' }, { status: 500 });
  }
}
