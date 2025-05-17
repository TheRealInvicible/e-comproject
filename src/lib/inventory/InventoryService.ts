import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { NotificationService } from '../notifications/NotificationService';

export interface InventoryUpdate {
  productId: string;
  quantity: number;
  type: 'INCREMENT' | 'DECREMENT' | 'SET';
  reason?: string;
}

export class InventoryService {
  static async updateStock(update: InventoryUpdate): Promise<void> {
    const product = await prisma.product.findUnique({
      where: { id: update.productId },
      select: {
        id: true,
        name: true,
        stockQuantity: true,
        lowStockThreshold: true
      }
    });

    if (!product) {
      throw new Error('Product not found');
    }

    let newQuantity: number;
    switch (update.type) {
      case 'INCREMENT':
        newQuantity = product.stockQuantity + update.quantity;
        break;
      case 'DECREMENT':
        newQuantity = product.stockQuantity - update.quantity;
        if (newQuantity < 0) {
          throw new Error('Insufficient stock');
        }
        break;
      case 'SET':
        newQuantity = update.quantity;
        break;
    }

    // Update stock in database
    await prisma.product.update({
      where: { id: update.productId },
      data: { stockQuantity: newQuantity }
    });

    // Log inventory change
    await prisma.inventoryLog.create({
      data: {
        productId: update.productId,
        changeAmount: update.quantity,
        type: update.type,
        reason: update.reason,
        previousQuantity: product.stockQuantity,
        newQuantity
      }
    });

    // Check if back in stock
    if (product.stockQuantity === 0 && newQuantity > 0) {
      const subscribedUsers = await this.getStockNotificationSubscribers(update.productId);
      await NotificationService.sendBackInStockNotification(
        product,
        subscribedUsers
      );
    }

    // Check low stock threshold
    if (
      newQuantity <= product.lowStockThreshold &&
      product.stockQuantity > product.lowStockThreshold
    ) {
      await this.sendLowStockAlert(product.id);
    }

    // Update Redis cache
    await redis.set(
      `product:${update.productId}:stock`,
      newQuantity,
      'EX',
      3600
    );
  }

  static async getStockLevel(productId: string): Promise<number> {
    // Try Redis first
    const cachedStock = await redis.get(`product:${productId}:stock`);
    if (cachedStock !== null) {
      return parseInt(cachedStock);
    }

    // Fallback to database
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { stockQuantity: true }
    });

    if (!product) {
      throw new Error('Product not found');
    }

    // Cache the result
    await redis.set(
      `product:${productId}:stock`,
      product.stockQuantity,
      'EX',
      3600
    );

    return product.stockQuantity;
  }

  static async reserveStock(
    productId: string,
    quantity: number
  ): Promise<boolean> {
    const key = `product:${productId}:stock`;
    const script = `
      local current = tonumber(redis.call('get', KEYS[1]))
      if not current then return false end
      if current < tonumber(ARGV[1]) then return false end
      redis.call('decrby', KEYS[1], ARGV[1])
      return true
    `;

    const result = await redis.eval(
      script,
      1,
      key,
      quantity.toString()
    );

    if (!result) {
      return false;
    }

    try {
      await this.updateStock({
        productId,
        quantity,
        type: 'DECREMENT',
        reason: 'RESERVATION'
      });
      return true;
    } catch (error) {
      // Rollback Redis if database update fails
      await redis.incrby(key, quantity);
      return false;
    }
  }

  static async releaseStock(
    productId: string,
    quantity: number
  ): Promise<void> {
    await this.updateStock({
      productId,
      quantity,
      type: 'INCREMENT',
      reason: 'RESERVATION_RELEASE'
    });
  }

  private static async getStockNotificationSubscribers(
    productId: string
  ): Promise<string[]> {
    const subscriptions = await prisma.stockNotification.findMany({
      where: {
        productId,
        active: true
      },
      select: { userId: true }
    });

    return subscriptions.map(sub => sub.userId);
  }

  private static async sendLowStockAlert(productId: string): Promise<void> {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { name: true, stockQuantity: true }
    });

    if (!product) return;

    // Notify admin users
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true }
    });

    for (const admin of admins) {
      await NotificationService.createNotification({
        userId: admin.id,
        type: 'LOW_STOCK',
        title: 'Low Stock Alert',
        message: `${product.name} is running low (${product.stockQuantity} units remaining)`,
        data: { productId, stockQuantity: product.stockQuantity }
      });
    }
  }

  static async getLowStockProducts(threshold?: number): Promise<any[]> {
    return prisma.product.findMany({
      where: {
        stockQuantity: {
          lte: threshold || prisma.product.fields.lowStockThreshold
        }
      },
      select: {
        id: true,
        name: true,
        stockQuantity: true,
        lowStockThreshold: true
      }
    });
  }

  static async getInventoryMovement(
    productId: string,
    startDate: Date,
    endDate: Date
  ): Promise<any[]> {
    return prisma.inventoryLog.findMany({
      where: {
        productId,
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { createdAt: 'asc' }
    });
  }
}