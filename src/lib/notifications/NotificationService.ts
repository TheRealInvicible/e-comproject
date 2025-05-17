import { prisma } from '@/lib/prisma';
import { Notification } from '@prisma/client';

export type NotificationType = 
  | 'PRICE_DROP'
  | 'BACK_IN_STOCK'
  | 'ORDER_STATUS'
  | 'WISHLIST_CHANGE'
  | 'DELIVERY_UPDATE';

export interface NotificationPayload {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
}

export class NotificationService {
  static async createNotification(payload: NotificationPayload): Promise<Notification> {
    return prisma.notification.create({
      data: {
        userId: payload.userId,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        data: payload.data || {},
        read: false
      }
    });
  }

  static async markAsRead(notificationId: string): Promise<void> {
    await prisma.notification.update({
      where: { id: notificationId },
      data: { read: true }
    });
  }

  static async getUserNotifications(userId: string): Promise<Notification[]> {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async sendPriceDropNotification(
    product: { id: string; name: string; price: number },
    oldPrice: number,
    subscribedUsers: string[]
  ): Promise<void> {
    const priceReduction = oldPrice - product.price;
    const percentageOff = Math.round((priceReduction / oldPrice) * 100);

    for (const userId of subscribedUsers) {
      await this.createNotification({
        userId,
        type: 'PRICE_DROP',
        title: 'Price Drop Alert! 🎉',
        message: `${product.name} is now ${percentageOff}% off!`,
        data: {
          productId: product.id,
          oldPrice,
          newPrice: product.price,
          percentageOff
        }
      });
    }
  }

  static async sendBackInStockNotification(
    product: { id: string; name: string },
    subscribedUsers: string[]
  ): Promise<void> {
    for (const userId of subscribedUsers) {
      await this.createNotification({
        userId,
        type: 'BACK_IN_STOCK',
        title: 'Back in Stock! 📦',
        message: `${product.name} is now back in stock!`,
        data: { productId: product.id }
      });
    }
  }

  static async sendOrderStatusNotification(
    userId: string,
    order: { id: string; status: string }
  ): Promise<void> {
    const statusMessages = {
      processing: 'Your order is being processed',
      shipped: 'Your order has been shipped',
      delivered: 'Your order has been delivered',
      cancelled: 'Your order has been cancelled'
    };

    await this.createNotification({
      userId,
      type: 'ORDER_STATUS',
      title: 'Order Update 🚚',
      message: statusMessages[order.status as keyof typeof statusMessages] || 'Order status updated',
      data: { orderId: order.id, status: order.status }
    });
  }

  static async sendDeliveryUpdateNotification(
    userId: string,
    delivery: { orderId: string; status: string; location: string }
  ): Promise<void> {
    await this.createNotification({
      userId,
      type: 'DELIVERY_UPDATE',
      title: 'Delivery Update 📍',
      message: `Your order is ${delivery.status} at ${delivery.location}`,
      data: {
        orderId: delivery.orderId,
        status: delivery.status,
        location: delivery.location
      }
    });
  }
}