import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// GET /api/products - Get all products with optional filtering
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    const where = {
      AND: [
        { status: 'ACTIVE' },
        search ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        } : {},
        category ? {
          categories: {
            some: {
              category: {
                id: category
              }
            }
          }
        } : {},
      ],
    };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          categories: {
            include: {
              category: true
            }
          },
          reviews: {
            where: { status: 'ACTIVE' },
            select: { rating: true }
          }
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.product.count({ where })
    ]);

    // Calculate average rating for each product
    const productsWithRating = products.map(product => ({
      ...product,
      averageRating: product.reviews.length
        ? product.reviews.reduce((acc, review) => acc + review.rating, 0) / product.reviews.length
        : null,
      totalReviews: product.reviews.length,
      reviews: undefined // Remove detailed review data
    }));

    return NextResponse.json({
      products: productsWithRating,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        page,
        limit
      }
    });
  } catch (error) {
    console.error('Products GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

// POST /api/products - Create a new product (Admin/Manager only)
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
      price,
      salePrice,
      stockQuantity,
      images,
      specifications,
      brand,
      weight,
      dimensions,
      categoryIds
    } = body;

    // Generate SKU - You might want to customize this logic
    const sku = `SKU-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    const product = await prisma.product.create({
      data: {
        sku,
        name,
        description,
        price: new Decimal(price),
        salePrice: salePrice ? new Decimal(salePrice) : null,
        stockQuantity,
        images,
        specifications,
        brand,
        weight,
        dimensions,
        categories: {
          create: categoryIds.map((categoryId: string) => ({
            category: {
              connect: { id: categoryId }
            }
          }))
        }
      },
      include: {
        categories: {
          include: {
            category: true
          }
        }
      }
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error('Product POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    );
  }
}