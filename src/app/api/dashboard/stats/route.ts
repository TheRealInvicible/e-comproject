import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const [
      totalOrders,
      totalCustomers,
      totalRevenue,
      activeProducts,
      // Get data for last month for comparison
      lastMonthOrders,
      lastMonthCustomers,
      lastMonthRevenue,
      lastMonthProducts
    ] = await Promise.all([
      // Current month stats
      prisma.order.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setDate(1)) // First day of current month
          }
        }
      }),
      prisma.user.count({
        where: {
          role: 'CUSTOMER',
          createdAt: {
            gte: new Date(new Date().setDate(1))
          }
        }
      }),
      prisma.order.aggregate({
        where: {
          status: 'DELIVERED',
          createdAt: {
            gte: new Date(new Date().setDate(1))
          }
        },
        _sum: {
          total: true
        }
      }),
      prisma.product.count({
        where: {
          status: 'ACTIVE'
        }
      }),
      // Last month stats
      prisma.order.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setMonth(new Date().getMonth() - 1, 1)),
            lt: new Date(new Date().setDate(1))
          }
        }
      }),
      prisma.user.count({
        where: {
          role: 'CUSTOMER',
          createdAt: {
            gte: new Date(new Date().setMonth(new Date().getMonth() - 1, 1)),
            lt: new Date(new Date().setDate(1))
          }
        }
      }),
      prisma.order.aggregate({
        where: {
          status: 'DELIVERED',
          createdAt: {
            gte: new Date(new Date().setMonth(new Date().getMonth() - 1, 1)),
            lt: new Date(new Date().setDate(1))
          }
        },
        _sum: {
          total: true
        }
      }),
      prisma.product.count({
        where: {
          status: 'ACTIVE',
          createdAt: {
            gte: new Date(new Date().setMonth(new Date().getMonth() - 1, 1)),
            lt: new Date(new Date().setDate(1))
          }
        }
      })
    ]);

    // Calculate percentage changes
    const calculateChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    const stats = {
      orders: {
        total: totalOrders,
        change: calculateChange(totalOrders, lastMonthOrders)
      },
      customers: {
        total: totalCustomers,
        change: calculateChange(totalCustomers, lastMonthCustomers)
      },
      revenue: {
        total: totalRevenue._sum.total || 0,
        change: calculateChange(
          totalRevenue._sum.total || 0,
          lastMonthRevenue._sum.total || 0
        )
      },
      products: {
        total: activeProducts,
        change: calculateChange(activeProducts, lastMonthProducts)
      }
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
}