import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// GET /api/categories - Get all categories
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parentId = searchParams.get('parentId');
    const includeInactive = searchParams.get('includeInactive') === 'true';

    const where = {
      ...(parentId ? { parentId } : { parentId: null }), // Get root categories if no parentId
      ...(includeInactive ? {} : { status: 'ACTIVE' })
    };

    const categories = await prisma.category.findMany({
      where,
      include: {
        children: {
          where: includeInactive ? {} : { status: 'ACTIVE' }
        },
        _count: {
          select: { products: true }
        }
      },
      orderBy: { displayOrder: 'asc' }
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error('Categories GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

// POST /api/categories - Create a new category (Admin/Manager only)
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session || !['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      name,
      description,
      image,
      parentId,
      displayOrder
    } = body;

    const category = await prisma.category.create({
      data: {
        name,
        description,
        image,
        parentId,
        displayOrder: displayOrder || 0
      },
      include: {
        parent: true,
        children: true
      }
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error('Category POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 500 }
    );
  }
}