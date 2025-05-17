import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Get top selling products based on order items
    const topProducts = await prisma.product.findMany({
      take: 5,
      where: {
        status: 'ACTIVE'
      },
      select: {
        id: true,
        name: true,
        price: true,
        images: true,
        orderItems: {
          where: {
            order: {
              createdAt: {
                gte: new Date(new Date().setDate(1)) // First day of current month
              }
            }
          },
          select: {
            quantity: true
          }
        },
        _count: {
          select: {
            reviews: true
          }
        }
      },
      orderBy: {
        orderItems: {
          _count: 'desc'
        }
      }
    });

    // Calculate total quantity sold for each product
    const formattedProducts = topProducts.map(product => ({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.images[0] || null,
      totalSold: product.orderItems.reduce((sum, item) => sum + item.quantity, 0),
      reviewCount: product._count.reviews
    }));

    return NextResponse.json(formattedProducts);
  } catch (error) {
    console.error('Top products error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch top products' },
      { status: 500 }
    );
  }
}