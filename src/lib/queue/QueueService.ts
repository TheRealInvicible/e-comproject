import Bull from 'bull';
import { redis } from '../redis';
import { EmailService } from '../email/EmailService';
import { NotificationService } from '../notifications/NotificationService';
import { OrderProcessor } from '../order/OrderProcessor';
import { PaymentIntegration } from '../payment/PaymentIntegration';

interface QueueJob {
  type: string;
  data: Record<string, any>;
}

export class QueueService {
  private static queues: Record<string, Bull.Queue> = {
    email: new Bull('email', { redis: redis }),
    notification: new Bull('notification', { redis: redis }),
    order: new Bull('order', { redis: redis }),
    refund: new Bull('refund', { redis: redis })
  };

  static async enqueue(
    queueName: string,
    data: QueueJob,
    options?: Bull.JobOptions
  ): Promise<void> {
    const queue = this.queues[queueName];
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    await queue.add(data, options);
  }

  static async processQueues(): Promise<void> {
    // Process email queue
    this.queues.email.process(async (job) => {
      const { type, data } = job.data;

      try {
        switch (type) {
          case 'ORDER_CONFIRMATION':
            await EmailService.sendEmail({
              template: 'order-confirmation',
              data: data
            });
            break;

          case 'SHIPPING_UPDATE':
            await EmailService.sendEmail({
              template: 'shipping-update',
              data: data
            });
            break;

          // Add more email types
          default:
            throw new Error(`Unknown email type: ${type}`);
        }
      } catch (error) {
        console.error('Email processing error:', error);
        throw error;
      }
    });

    // Process notification queue
    this.queues.notification.process(async (job) => {
      const { type, data } = job.data;

      try {
        switch (type) {
          case 'NEW_ORDER':
            await NotificationService.createNotification({
              type: 'NEW_ORDER',
              title: 'New Order Received',
              message: `New order #${data.orderId} received`,
              data: data
            });
            break;

          case 'LOW_STOCK':
            await NotificationService.createNotification({
              type: 'LOW_STOCK',
              title: 'Low Stock Alert',
              message: `Product ${data.productId} is running low`,
              data: data
            });
            break;

          // Add more notification types
          default:
            throw new Error(`Unknown notification type: ${type}`);
        }
      } catch (error) {
        console.error('Notification processing error:', error);
        throw error;
      }
    });

    // Process order queue
    this.queues.order.process(async (job) => {
      const { orderId } = job.data;

      try {
        await OrderProcessor.processOrder(orderId);
      } catch (error) {
        console.error('Order processing error:', error);
        throw error;
      }
    });

    // Process refund queue
    this.queues.refund.process(async (job) => {
      const { orderId, amount } = job.data;

      try {
        await OrderProcessor.handleOrderRefund(orderId, amount);
      } catch (error) {
        console.error('Refund processing error:', error);
        throw error;
      }
    });

    // Add error handlers
    Object.values(this.queues).forEach(queue => {
      queue.on('error', (error) => {
        console.error(`Queue error in ${queue.name}:`, error);
      });

      queue.on('failed', (job, error) => {
        console.error(`Job failed in ${queue.name}:`, {
          jobId: job.id,
          error
        });
      });
    });
  }

  static async getQueueStats(): Promise<Record<string, any>> {
    const stats: Record<string, any> = {};

    for (const [name, queue] of Object.entries(this.queues)) {
      stats[name] = {
        waiting: await queue.getWaitingCount(),
        active: await queue.getActiveCount(),
        completed: await queue.getCompletedCount(),
        failed: await queue.getFailedCount()
      };
    }

    return stats;
  }

  static async clearQueue(queueName: string): Promise<void> {
    const queue = this.queues[queueName];
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    await queue.empty();
  }

  static async retryFailedJobs(queueName: string): Promise<void> {
    const queue = this.queues[queueName];
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const failed = await queue.getFailed();
    for (const job of failed) {
      await job.retry();
    }
  }
}