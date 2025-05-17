import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { EmailService } from '../email/EmailService';

export interface AbandonedCart {
  id: string;
  userId: string;
  items: CartItem[];
  createdAt: Date;
  lastUpdated: Date;
  totalValue: number;
  recoveryStatus: 'PENDING' | 'NOTIFIED' | 'RECOVERED' | 'EXPIRED';
}

interface CartItem {
  productId: string;
  quantity: number;
  price: number;
}

export class CartRecoveryService {
  private static readonly CART_EXPIRY = 24 * 60 * 60; // 24 hours in seconds
  private static readonly REMINDER_DELAY = 1 * 60 * 60; // 1 hour in seconds

  static async saveCart(userId: string, items: CartItem[]): Promise<void> {
    const totalValue = items.reduce(
      (sum, item) => sum + (item.price * item.quantity),
      0
    );

    const cartKey = `cart:${userId}`;
    
    await redis.multi()
      .hset(cartKey, {
        items: JSON.stringify(items),
        totalValue: totalValue.toString(),
        lastUpdated: Date.now().toString()
      })
      .expire(cartKey, this.CART_EXPIRY)
      .exec();

    // Schedule recovery process
    await this.scheduleRecovery(userId);
  }

  static async getCart(userId: string): Promise<AbandonedCart | null> {
    const cartKey = `cart:${userId}`;
    const cart = await redis.hgetall(cartKey);

    if (!cart || !cart.items) {
      return null;
    }

    return {
      id: cartKey,
      userId,
      items: JSON.parse(cart.items),
      createdAt: new Date(parseInt(cart.createdAt)),
      lastUpdated: new Date(parseInt(cart.lastUpdated)),
      totalValue: parseFloat(cart.totalValue),
      recoveryStatus: cart.recoveryStatus || 'PENDING'
    };
  }

  static async scheduleRecovery(userId: string): Promise<void> {
    const recoveryKey = `cart:recovery:${userId}`;
    
    // Schedule reminder
    await redis.multi()
      .set(recoveryKey, 'scheduled')
      .expire(recoveryKey, this.REMINDER_DELAY)
      .exec();
  }

  static async processRecovery(): Promise<void> {
    const abandonedCarts = await this.getAbandonedCarts();

    for (const cart of abandonedCarts) {
      await this.sendRecoveryEmail(cart);

      // Update recovery status
      await redis.hset(`cart:${cart.userId}`, 'recoveryStatus', 'NOTIFIED');

      // Log recovery attempt
      await prisma.cartRecovery.create({
        data: {
          userId: cart.userId,
          cartData: cart.items,
          totalValue: cart.totalValue,
          status: 'NOTIFIED'
        }
      });
    }
  }

  private static async getAbandonedCarts(): Promise<AbandonedCart[]> {
    const keys = await redis.keys('cart:*');
    const abandonedCarts: AbandonedCart[] = [];

    for (const key of keys) {
      if (key.startsWith('cart:recovery:')) continue;

      const cart = await redis.hgetall(key);
      if (!cart || !cart.items) continue;

      const userId = key.split(':')[1];
      const lastUpdated = parseInt(cart.lastUpdated);

      // Check if cart is abandoned (no updates for reminder delay)
      if (
        Date.now() - lastUpdated >= this.REMINDER_DELAY * 1000 &&
        cart.recoveryStatus !== 'NOTIFIED'
      ) {
        abandonedCarts.push({
          id: key,
          userId,
          items: JSON.parse(cart.items),
          createdAt: new Date(parseInt(cart.createdAt)),
          lastUpdated: new Date(lastUpdated),
          totalValue: parseFloat(cart.totalValue),
          recoveryStatus: cart.recoveryStatus || 'PENDING'
        });
      }
    }

    return abandonedCarts;
  }

  private static async sendRecoveryEmail(cart: AbandonedCart): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: cart.userId },
      select: { email: true, name: true }
    });

    if (!user?.email) return;

    const products = await prisma.product.findMany({
      where: {
        id: {
          in: cart.items.map(item => item.productId)
        }
      },
      select: {
        id: true,
        name: true,
        images: true
      }
    });

    const emailData = {
      to: user.email,
      subject: 'Complete Your Purchase at Dominion Store',
      template: 'cart-recovery',
      data: {
        name: user.name,
        items: cart.items.map(item => ({
          ...item,
          product: products.find(p => p.id === item.productId)
        })),
        totalValue: cart.totalValue,
        recoveryUrl: `${process.env.NEXT_PUBLIC_APP_URL}/cart/recover?id=${cart.id}`
      }
    };

    await EmailService.sendEmail(emailData);
  }

  static async recoverCart(cartId: string): Promise<void> {
    const cart = await redis.hgetall(cartId);
    if (!cart || !cart.items) return;

    // Update recovery status
    await redis.hset(cartId, 'recoveryStatus', 'RECOVERED');

    // Log recovery success
    await prisma.cartRecovery.update({
      where: {
        cartId
      },
      data: {
        status: 'RECOVERED',
        recoveredAt: new Date()
      }
    });
  }

  static async getRecoveryStats(
    startDate: Date,
    endDate: Date
  ): Promise<any> {
    const stats = await prisma.cartRecovery.groupBy({
      by: ['status'],
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      _count: true,
      _sum: {
        totalValue: true
      }
    });

    return {
      total: stats.reduce((sum, stat) => sum + stat._count, 0),
      recovered: stats.find(s => s.status === 'RECOVERED')?._count || 0,
      totalValue: stats.reduce((sum, stat) => sum + (stat._sum.totalValue || 0), 0),
      recoveredValue: stats.find(s => s.status === 'RECOVERED')?._sum.totalValue || 0
    };
  }
}