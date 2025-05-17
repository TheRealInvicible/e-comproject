import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';

export interface AnalyticsEvent {
  type: string;
  userId?: string;
  data: Record<string, any>;
  timestamp: Date;
}

export class AnalyticsService {
  static async trackEvent(event: AnalyticsEvent): Promise<void> {
    // Store event in Redis for real-time processing
    await redis.xadd(
      'analytics_stream',
      '*',
      'type', event.type,
      'userId', event.userId || 'anonymous',
      'data', JSON.stringify(event.data),
      'timestamp', event.timestamp.toISOString()
    );

    // Store in database for historical analysis
    await prisma.analyticsEvent.create({
      data: {
        type: event.type,
        userId: event.userId,
        data: event.data,
        timestamp: event.timestamp
      }
    });
  }

  static async getDashboardStats(period: 'day' | 'week' | 'month'): Promise<any> {
    const startDate = new Date();
    switch (period) {
      case 'day':
        startDate.setDate(startDate.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
    }

    const [
      totalSales,
      totalOrders,
      averageOrderValue,
      topProducts,
      topCategories
    ] = await Promise.all([
      // Total sales
      prisma.order.aggregate({
        where: {
          createdAt: { gte: startDate },
          status: 'completed'
        },
        _sum: { total: true }
      }),

      // Total orders
      prisma.order.count({
        where: {
          createdAt: { gte: startDate }
        }
      }),

      // Average order value
      prisma.order.aggregate({
        where: {
          createdAt: { gte: startDate },
          status: 'completed'
        },
        _avg: { total: true }
      }),

      // Top products
      prisma.orderItem.groupBy({
        by: ['productId'],
        where: {
          order: {
            createdAt: { gte: startDate },
            status: 'completed'
          }
        },
        _sum: {
          quantity: true
        },
        orderBy: {
          _sum: {
            quantity: 'desc'
          }
        },
        take: 5
      }),

      // Top categories
      prisma.orderItem.groupBy({
        by: ['productId'],
        where: {
          order: {
            createdAt: { gte: startDate },
            status: 'completed'
          }
        },
        _sum: {
          quantity: true
        },
        include: {
          product: {
            select: {
              category: true
            }
          }
        },
        orderBy: {
          _sum: {
            quantity: 'desc'
          }
        }
      })
    ]);

    return {
      totalSales: totalSales._sum.total || 0,
      totalOrders,
      averageOrderValue: averageOrderValue._avg.total || 0,
      topProducts,
      topCategories: this.aggregateCategories(topCategories)
    };
  }

  private static aggregateCategories(data: any[]): any[] {
    const categoryMap = new Map();

    data.forEach(item => {
      const categoryId = item.product.category.id;
      const currentSum = categoryMap.get(categoryId)?.sum || 0;
      categoryMap.set(categoryId, {
        category: item.product.category,
        sum: currentSum + item._sum.quantity
      });
    });

    return Array.from(categoryMap.values())
      .sort((a, b) => b.sum - a.sum)
      .slice(0, 5);
  }

  static async getUserBehaviorAnalytics(userId: string): Promise<any> {
    const [
      viewedProducts,
      purchaseHistory,
      averagePurchaseValue,
      categoryPreferences
    ] = await Promise.all([
      // Recently viewed products
      prisma.analyticsEvent.findMany({
        where: {
          userId,
          type: 'PRODUCT_VIEW'
        },
        orderBy: { timestamp: 'desc' },
        take: 10
      }),

      // Purchase history
      prisma.order.findMany({
        where: {
          userId,
          status: 'completed'
        },
        include: {
          items: true
        },
        orderBy: { createdAt: 'desc' }
      }),

      // Average purchase value
      prisma.order.aggregate({
        where: {
          userId,
          status: 'completed'
        },
        _avg: { total: true }
      }),

      // Category preferences
      prisma.orderItem.groupBy({
        by: ['productId'],
        where: {
          order: {
            userId,
            status: 'completed'
          }
        },
        include: {
          product: {
            select: {
              category: true
            }
          }
        },
        _sum: {
          quantity: true
        }
      })
    ]);

    return {
      viewedProducts,
      purchaseHistory,
      averagePurchaseValue: averagePurchaseValue._avg.total || 0,
      categoryPreferences: this.aggregateCategories(categoryPreferences)
    };
  }

  static async getProductPerformanceMetrics(productId: string): Promise<any> {
    const [
      viewCount,
      purchaseCount,
      conversionRate,
      averageRating,
      relatedProducts
    ] = await Promise.all([
      // View count
      prisma.analyticsEvent.count({
        where: {
          type: 'PRODUCT_VIEW',
          data: {
            path: ['productId'],
            equals: productId
          }
        }
      }),

      // Purchase count
      prisma.orderItem.aggregate({
        where: {
          productId,
          order: {
            status: 'completed'
          }
        },
        _sum: {
          quantity: true
        }
      }),

      // Conversion rate calculation
      prisma.$transaction(async (tx) => {
        const views = await tx.analyticsEvent.count({
          where: {
            type: 'PRODUCT_VIEW',
            data: {
              path: ['productId'],
              equals: productId
            }
          }
        });

        const purchases = await tx.orderItem.count({
          where: {
            productId,
            order: {
              status: 'completed'
            }
          }
        });

        return views > 0 ? (purchases / views) * 100 : 0;
      }),

      // Average rating
      prisma.review.aggregate({
        where: {
          productId
        },
        _avg: {
          rating: true
        }
      }),

      // Related products based on co-purchases
      prisma.orderItem.groupBy({
        by: ['productId'],
        where: {
          order: {
            items: {
              some: {
                productId
              }
            }
          },
          NOT: {
            productId
          }
        },
        _count: true,
        orderBy: {
          _count: {
            _all: 'desc'
          }
        },
        take: 5
      })
    ]);

    return {
      viewCount,
      purchaseCount: purchaseCount._sum.quantity || 0,
      conversionRate,
      averageRating: averageRating._avg.rating || 0,
      relatedProducts
    };
  }
}