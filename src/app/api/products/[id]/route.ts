import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// GET /api/products/[id] - Get a single product
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: {
        categories: {
          include: {
            category: true
          }
        },
        reviews: {
          where: { status: 'ACTIVE' },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Calculate average rating
    const averageRating = product.reviews.length
      ? product.reviews.reduce((acc, review) => acc + review.rating, 0) / product.reviews.length
      : null;

    return NextResponse.json({
      ...product,
      averageRating,
      totalReviews: product.reviews.length
    });
  } catch (error) {
    console.error('Product GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product' },
      { status: 500 }
    );
  }
}

// PATCH /api/products/[id] - Update a product (Admin/Manager only)
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
      price,
      salePrice,
      stockQuantity,
      images,
      specifications,
      brand,
      weight,
      dimensions,
      categoryIds,
      status
    } = body;

    // Prepare the update data
    const updateData: any = {
      ...(name && { name }),
      ...(description && { description }),
      ...(price && { price: new Decimal(price) }),
      ...(salePrice && { salePrice: new Decimal(salePrice) }),
      ...(stockQuantity !== undefined && { stockQuantity }),
      ...(images && { images }),
      ...(specifications && { specifications }),
      ...(brand && { brand }),
      ...(weight && { weight }),
      ...(dimensions && { dimensions }),
      ...(status && { status })
    };

    // Update categories if provided
    if (categoryIds) {
      // First delete existing category relationships
      await prisma.categoryProduct.deleteMany({
        where: { productId: params.id }
      });

      // Then create new ones
      updateData.categories = {
        create: categoryIds.map((categoryId: string) => ({
          category: {
            connect: { id: categoryId }
          }
        }))
      };
    }

    const product = await prisma.product.update({
      where: { id: params.id },
      data: updateData,
      include: {
        categories: {
          include: {
            category: true
          }
        }
      }
    });

    return NextResponse.json(product);
  } catch (error) {
    console.error('Product PATCH error:', error);
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    );
  }
}

// DELETE /api/products/[id] - Delete a product (Admin only)
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

    // Instead of deleting, we'll mark the product as inactive
    await prisma.product.update({
      where: { id: params.id },
      data: { status: 'INACTIVE' }
    });

    return NextResponse.json(
      { message: 'Product deleted successfully' }
    );
  } catch (error) {
    console.error('Product DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    );
  }
}