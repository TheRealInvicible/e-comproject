import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// GET /api/categories/[id] - Get a single category with its products
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    const [category, productsCount] = await Promise.all([
      prisma.category.findUnique({
        where: { id: params.id },
        include: {
          parent: true,
          children: {
            where: { status: 'ACTIVE' }
          },
          products: {
            where: {
              product: { status: 'ACTIVE' }
            },
            include: {
              product: {
                include: {
                  reviews: {
                    where: { status: 'ACTIVE' },
                    select: { rating: true }
                  }
                }
              }
            },
            skip,
            take: limit
          }
        }
      }),
      prisma.categoryProduct.count({
        where: {
          categoryId: params.id,
          product: { status: 'ACTIVE' }
        }
      })
    ]);

    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    // Transform the products data to include average rating
    const products = category.products.map(cp => {
      const product = cp.product;
      const averageRating = product.reviews.length
        ? product.reviews.reduce((acc, review) => acc + review.rating, 0) / product.reviews.length
        : null;
      
      return {
        ...product,
        averageRating,
        totalReviews: product.reviews.length,
        reviews: undefined
      };
    });

    return NextResponse.json({
      ...category,
      products,
      pagination: {
        total: productsCount,
        pages: Math.ceil(productsCount / limit),
        page,
        limit
      }
    });
  } catch (error) {
    console.error('Category GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch category' },
      { status: 500 }
    );
  }
}

// PATCH /api/categories/[id] - Update a category (Admin/Manager only)
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
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
      displayOrder,
      status
    } = body;

    // Check for circular reference if parentId is provided
    if (parentId) {
      const wouldCreateCycle = await checkForCategoryCycle(params.id, parentId);
      if (wouldCreateCycle) {
        return NextResponse.json(
          { error: 'Cannot create circular category reference' },
          { status: 400 }
        );
      }
    }

    const category = await prisma.category.update({
      where: { id: params.id },
      data: {
        name,
        description,
        image,
        parentId,
        displayOrder,
        status
      },
      include: {
        parent: true,
        children: true
      }
    });

    return NextResponse.json(category);
  } catch (error) {
    console.error('Category PATCH error:', error);
    return NextResponse.json(
      { error: 'Failed to update category' },
      { status: 500 }
    );
  }
}

// DELETE /api/categories/[id] - Delete a category (Admin only)
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Instead of deleting, mark as inactive
    await prisma.category.update({
      where: { id: params.id },
      data: { status: 'INACTIVE' }
    });

    return NextResponse.json(
      { message: 'Category deleted successfully' }
    );
  } catch (error) {
    console.error('Category DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete category' },
      { status: 500 }
    );
  }
}

// Helper function to check for circular references in category hierarchy
async function checkForCategoryCycle(categoryId: string, newParentId: string): Promise<boolean> {
  let currentId = newParentId;
  const visited = new Set<string>();

  while (currentId) {
    if (currentId === categoryId) return true;
    if (visited.has(currentId)) return true;
    visited.add(currentId);

    const parent = await prisma.category.findUnique({
      where: { id: currentId },
      select: { parentId: true }
    });

    if (!parent || !parent.parentId) break;
    currentId = parent.parentId;
  }

  return false;
}