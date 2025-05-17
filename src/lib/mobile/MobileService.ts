import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export class MobileService {
  // Push Notifications
  static async registerPushSubscription(
    userId: string,
    subscription: PushSubscription
  ) {
    return prisma.pushSubscription.create({
      data: {
        userId,
        endpoint: subscription.endpoint,
        p256dhKey: subscription.keys.p256dh,
        authKey: subscription.keys.auth
      }
    });
  }

  static async unregisterPushSubscription(endpoint: string) {
    return prisma.pushSubscription.deleteMany({
      where: { endpoint }
    });
  }

  static async sendPushNotification(
    subscription: PushSubscription,
    data: {
      title: string;
      body: string;
      icon?: string;
      image?: string;
      data?: any;
    }
  ) {
    const webpush = require('web-push');

    webpush.setVapidDetails(
      'mailto:support@dominionstore.com',
      process.env.VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!
    );

    try {
      await webpush.sendNotification(
        subscription,
        JSON.stringify(data)
      );
    } catch (error) {
      if (error.statusCode === 410) {
        // Subscription has expired or is no longer valid
        await this.unregisterPushSubscription(subscription.endpoint);
      }
      throw error;
    }
  }

  // Offline Support
  static async getCacheManifest() {
    return {
      name: 'dominion-store-v1',
      short_name: 'Dominion',
      start_url: '/',
      display: 'standalone',
      background_color: '#ffffff',
      theme_color: '#000000',
      icons: [
        {
          src: '/icons/icon-192x192.png',
          sizes: '192x192',
          type: 'image/png'
        },
        {
          src: '/icons/icon-512x512.png',
          sizes: '512x512',
          type: 'image/png'
        }
      ],
      routes: [
        '/',
        '/products',
        '/categories',
        '/cart',
        '/offline'
      ],
      api_cache: [
        '/api/products/featured',
        '/api/categories'
      ]
    };
  }

  // Mobile Optimizations
  static async getOptimizedImages(
    imageUrl: string,
    devicePixelRatio: number
  ) {
    const sharp = require('sharp');
    const response = await fetch(imageUrl);
    const buffer = await response.arrayBuffer();

    const image = sharp(Buffer.from(buffer));
    const metadata = await image.metadata();

    const targetWidth = Math.round(metadata.width! / devicePixelRatio);

    const optimized = await image
      .resize(targetWidth)
      .webp({ quality: 80 })
      .toBuffer();

    return optimized;
  }

  // Mobile Payments
  static async initializeMobilePayment(
    orderId: string,
    method: 'USSD' | 'BANK_TRANSFER' | 'MOBILE_MONEY'
  ) {
    const order = await prisma.order.findUnique({
      where: { id: orderId }
    });

    if (!order) {
      throw new Error('Order not found');
    }

    switch (method) {
      case 'USSD':
        return this.initializeUSSDPayment(order);
      case 'BANK_TRANSFER':
        return this.initializeBankTransfer(order);
      case 'MOBILE_MONEY':
        return this.initializeMobileMoney(order);
      default:
        throw new Error('Unsupported payment method');
    }
  }

  private static async initializeUSSDPayment(order: any) {
    // Implementation depends on the USSD gateway provider
    return {
      type: 'USSD',
      code: '*123*1*1#',
      reference: order.id,
      amount: order.total
    };
  }

  private static async initializeBankTransfer(order: any) {
    // Generate unique transfer reference
    const reference = `DOM${order.id.substring(0, 8)}`;
    
    await prisma.paymentReference.create({
      data: {
        orderId: order.id,
        reference,
        type: 'BANK_TRANSFER',
        amount: order.total,
        status: 'PENDING'
      }
    });

    return {
      type: 'BANK_TRANSFER',
      accountNumber: '0123456789',
      bankName: 'Dominion Bank',
      accountName: 'Dominion Store',
      reference,
      amount: order.total
    };
  }

  private static async initializeMobileMoney(order: any) {
    // Implementation depends on the mobile money provider
    return {
      type: 'MOBILE_MONEY',
      provider: 'MTN',
      number: '08012345678',
      reference: order.id,
      amount: order.total
    };
  }

  // Mobile Analytics
  static async trackMobileEvent(data: {
    userId: string;
    eventType: string;
    deviceInfo: any;
    metadata?: any;
  }) {
    return prisma.mobileAnalytics.create({
      data: {
        ...data,
        timestamp: new Date()
      }
    });
  }

  static async getMobileAnalytics(
    startDate: Date,
    endDate: Date
  ) {
    const [events, devices] = await Promise.all([
      // Event analytics
      prisma.mobileAnalytics.groupBy({
        where: {
          timestamp: {
            gte: startDate,
            lte: endDate
          }
        },
        by: ['eventType'],
        _count: true
      }),

      // Device analytics
      prisma.mobileAnalytics.groupBy({
        where: {
          timestamp: {
            gte: startDate,
            lte: endDate
          }
        },
        by: ['deviceInfo'],
        _count: true
      })
    ]);

    return {
      events: events.reduce((acc, event) => {
        acc[event.eventType] = event._count;
        return acc;
      }, {} as Record<string, number>),
      devices: devices.reduce((acc, device) => {
        const deviceInfo = JSON.parse(device.deviceInfo);
        const key = `${deviceInfo.os}_${deviceInfo.model}`;
        acc[key] = device._count;
        return acc;
      }, {} as Record<string, number>)
    };
  }

  // Performance Monitoring
  static async trackPerformanceMetric(data: {
    userId: string;
    metric: string;
    value: number;
    deviceInfo: any;
  }) {
    await redis.zadd(
      `mobile:metrics:${data.metric}`,
      data.value,
      JSON.stringify({
        userId: data.userId,
        deviceInfo: data.deviceInfo,
        timestamp: Date.now()
      })
    );

    // Keep only last 1000 metrics
    await redis.zremrangebyrank(
      `mobile:metrics:${data.metric}`,
      0,
      -1001
    );
  }

  static async getPerformanceMetrics(
    metric: string,
    period: 'hour' | 'day' | 'week'
  ) {
    const now = Date.now();
    const periodMs = {
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000
    }[period];

    const metrics = await redis.zrangebyscore(
      `mobile:metrics:${metric}`,
      now - periodMs,
      now,
      'WITHSCORES'
    );

    return metrics.map((m, i) => {
      if (i % 2 === 0) {
        const data = JSON.parse(m);
        return {
          ...data,
          value: parseFloat(metrics[i + 1])
        };
      }
    }).filter(Boolean);
  }
}