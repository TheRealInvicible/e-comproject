import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') 
      ? new Date(searchParams.get('startDate')!) 
      : new Date(new Date().setDate(1));
    const endDate = searchParams.get('endDate')
      ? new Date(searchParams.get('endDate')!)
      : new Date();

    // Get daily stats for the period
    const dailyStats = await prisma.order.groupBy({
      by: ['createdAt'],
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      _sum: {
        total: true
      },
      _count: true
    });

    // Get category performance
    const categoryPerformance = await prisma.category.findMany({
      where: {
        products: {
          some: {
            orderItems: {
              some: {
                order: {
                  createdAt: {
                    gte: startDate,
                    lte: endDate
                  }
                }
              }
            }
          }
        }
      },
      select: {
        id: true,
        name: true,
        products: {
          select: {
            orderItems: {
              where: {
                order: {
                  createdAt: {
                    gte: startDate,
                    lte: endDate
                  }
                }
              },
              select: {
                quantity: true,
                price: true
              }
            }
          }
        }
      }
    });

    // Get payment method distribution
    const paymentMethods = await prisma.order.groupBy({
      by: ['paymentMethod'],
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      _count: true,
      _sum: {
        total: true
      }
    });

    // Get customer acquisition data
    const newCustomers = await prisma.user.groupBy({
      by: ['createdAt'],
      where: {
        role: 'CUSTOMER',
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      _count: true
    });

    // Process category performance data
    const categoryStats = categoryPerformance.map(category => ({
      id: category.id,
      name: category.name,
      totalSales: category.products.reduce((sum, product) => 
        sum + product.orderItems.reduce((itemSum, item) => 
          itemSum + (item.price * item.quantity), 0
        ), 0
      ),
      totalOrders: category.products.reduce((sum, product) => 
        sum + product.orderItems.length, 0
      )
    }));

    return NextResponse.json({
      dailyStats: dailyStats.map(stat => ({
        date: stat.createdAt,
        revenue: stat._sum.total || 0,
        orders: stat._count
      })),
      categoryStats,
      paymentMethods: paymentMethods.map(method => ({
        method: method.paymentMethod,
        count: method._count,
        total: method._sum.total || 0
      })),
      customerAcquisition: newCustomers.map(stat => ({
        date: stat.createdAt,
        count: stat._count
      }))
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
}