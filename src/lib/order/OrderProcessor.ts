import { prisma } from '@/lib/prisma';
import { InventoryService } from '../inventory/InventoryService';
import { NotificationService } from '../notifications/NotificationService';
import { EmailService } from '../email/EmailService';
import { ShippingService } from '../shipping/ShippingService';
import { QueueService } from '../queue/QueueService';

export class OrderProcessor {
  static async processOrder(orderId: string): Promise<void> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: true
          }
        },
        user: true
      }
    });

    if (!order) {
      throw new Error('Order not found');
    }

    try {
      // Start transaction
      await prisma.$transaction(async (tx) => {
        // 1. Verify inventory
        await this.verifyInventory(order.items);

        // 2. Update inventory
        await this.updateInventory(order.items);

        // 3. Update order status
        await tx.order.update({
          where: { id: orderId },
          data: { status: 'PROCESSING' }
        });

        // 4. Generate shipping label
        const shippingLabel = await ShippingService.generateShippingLabel(order);

        // 5. Update order with shipping information
        await tx.order.update({
          where: { id: orderId },
          data: {
            shippingLabel,
            trackingNumber: shippingLabel.trackingNumber,
            status: 'READY_FOR_SHIPPING'
          }
        });
      });

      // Queue async tasks
      await Promise.all([
        // Send order confirmation email
        QueueService.enqueue('email', {
          type: 'ORDER_CONFIRMATION',
          orderId,
          userId: order.userId
        }),

        // Send admin notification
        QueueService.enqueue('notification', {
          type: 'NEW_ORDER',
          orderId,
          amount: order.total
        }),

        // Send customer notification
        NotificationService.sendOrderStatusNotification(
          order.userId,
          { id: orderId, status: 'PROCESSING' }
        )
      ]);

    } catch (error) {
      console.error('Order processing error:', error);
      
      // Update order status to failed
      await prisma.order.update({
        where: { id: orderId },
        data: { 
          status: 'FAILED',
          statusMessage: error instanceof Error ? error.message : 'Processing failed'
        }
      });

      // Notify admin about failure
      await NotificationService.createNotification({
        userId: 'admin', // Replace with actual admin ID
        type: 'ORDER_PROCESSING_FAILED',
        title: 'Order Processing Failed',
        message: `Order ${orderId} failed to process`,
        data: { orderId, error: error instanceof Error ? error.message : 'Unknown error' }
      });

      throw error;
    }
  }

  private static async verifyInventory(
    items: Array<{
      quantity: number;
      product: { id: string; stockQuantity: number }
    }>
  ): Promise<void> {
    for (const item of items) {
      const currentStock = await InventoryService.getStockLevel(item.product.id);
      if (currentStock < item.quantity) {
        throw new Error(`Insufficient stock for product ${item.product.id}`);
      }
    }
  }

  private static async updateInventory(
    items: Array<{
      quantity: number;
      product: { id: string }
    }>
  ): Promise<void> {
    for (const item of items) {
      await InventoryService.updateStock({
        productId: item.product.id,
        quantity: item.quantity,
        type: 'DECREMENT',
        reason: 'ORDER_FULFILLMENT'
      });
    }
  }

  static async handleOrderCancellation(orderId: string): Promise<void> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    });

    if (!order) {
      throw new Error('Order not found');
    }

    await prisma.$transaction(async (tx) => {
      // Restore inventory
      for (const item of order.items) {
        await InventoryService.updateStock({
          productId: item.product.id,
          quantity: item.quantity,
          type: 'INCREMENT',
          reason: 'ORDER_CANCELLATION'
        });
      }

      // Update order status
      await tx.order.update({
        where: { id: orderId },
        data: { status: 'CANCELLED' }
      });

      // Process refund if payment was made
      if (order.paymentStatus === 'PAID') {
        await QueueService.enqueue('refund', {
          orderId,
          amount: order.total
        });
      }
    });

    // Send notifications
    await Promise.all([
      NotificationService.sendOrderStatusNotification(
        order.userId,
        { id: orderId, status: 'CANCELLED' }
      ),
      EmailService.sendEmail({
        to: order.user.email,
        template: 'order-cancelled',
        data: { order }
      })
    ]);
  }

  static async handleOrderRefund(
    orderId: string,
    amount?: number
  ): Promise<void> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        payment: true,
        user: true
      }
    });

    if (!order) {
      throw new Error('Order not found');
    }

    if (!order.payment) {
      throw new Error('No payment found for order');
    }

    try {
      // Process refund
      const refundResult = await PaymentIntegration.refundPayment(
        order.payment.transactionId,
        amount
      );

      // Update order status
      await prisma.order.update({
        where: { id: orderId },
        data: {
          refundStatus: 'PROCESSED',
          refundAmount: amount || order.total
        }
      });

      // Send notifications
      await Promise.all([
        NotificationService.createNotification({
          userId: order.userId,
          type: 'REFUND_PROCESSED',
          title: 'Refund Processed',
          message: `Your refund of ${amount || order.total} has been processed`,
          data: { orderId, refundAmount: amount || order.total }
        }),
        EmailService.sendEmail({
          to: order.user.email,
          template: 'refund-processed',
          data: { order, refundAmount: amount || order.total }
        })
      ]);

    } catch (error) {
      console.error('Refund processing error:', error);
      
      // Update refund status
      await prisma.order.update({
        where: { id: orderId },
        data: {
          refundStatus: 'FAILED',
          statusMessage: error instanceof Error ? error.message : 'Refund failed'
        }
      });

      throw error;
    }
  }
}