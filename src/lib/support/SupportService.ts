import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { NotificationService } from '../notifications/NotificationService';
import { EmailService } from '../email/EmailService';

interface TicketData {
  userId: string;
  subject: string;
  message: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
  orderId?: string;
  attachments?: string[];
}

interface FAQCategory {
  name: string;
  description?: string;
  order?: number;
}

interface FAQItem {
  question: string;
  answer: string;
  categoryId: string;
  order?: number;
}

export class SupportService {
  // Ticket Management
  static async createTicket(data: TicketData) {
    const ticket = await prisma.ticket.create({
      data: {
        ...data,
        status: 'OPEN',
        priority: data.priority || 'MEDIUM'
      }
    });

    // Notify support team
    await NotificationService.createNotification({
      userId: 'support-team', // Replace with actual support team ID
      type: 'NEW_TICKET',
      title: 'New Support Ticket',
      message: `New ticket: ${data.subject}`,
      data: { ticketId: ticket.id }
    });

    // Send confirmation email to user
    await EmailService.sendEmail({
      template: 'ticket-confirmation',
      data: {
        ticketId: ticket.id,
        subject: data.subject
      }
    });

    return ticket;
  }

  static async updateTicket(
    ticketId: string,
    data: {
      status?: string;
      priority?: string;
      assignedTo?: string;
      response?: string;
    }
  ) {
    const ticket = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        ...data,
        updatedAt: new Date()
      },
      include: {
        user: true
      }
    });

    // Notify user of update
    if (data.response) {
      await NotificationService.createNotification({
        userId: ticket.userId,
        type: 'TICKET_UPDATE',
        title: 'Support Ticket Updated',
        message: 'Your ticket has received a response',
        data: { ticketId }
      });

      await EmailService.sendEmail({
        to: ticket.user.email,
        template: 'ticket-update',
        data: {
          ticketId,
          response: data.response
        }
      });
    }

    return ticket;
  }

  static async getTicketStats() {
    const stats = await prisma.ticket.groupBy({
      by: ['status', 'priority'],
      _count: true
    });

    return stats.reduce((acc, stat) => {
      const key = `${stat.status}_${stat.priority}`;
      acc[key] = stat._count;
      return acc;
    }, {} as Record<string, number>);
  }

  // Live Chat
  static async initializeChatSession(userId: string) {
    const sessionId = `chat:${userId}:${Date.now()}`;
    
    await redis.multi()
      .hset(sessionId, {
        userId,
        status: 'WAITING',
        startTime: Date.now().toString()
      })
      .expire(sessionId, 24 * 60 * 60) // 24 hours
      .exec();

    return sessionId;
  }

  static async addChatMessage(
    sessionId: string,
    message: {
      sender: string;
      content: string;
      type?: 'TEXT' | 'IMAGE' | 'FILE';
    }
  ) {
    const messageId = Date.now().toString();
    await redis.hset(
      `${sessionId}:messages`,
      messageId,
      JSON.stringify({
        ...message,
        timestamp: new Date().toISOString()
      })
    );

    // Store in database for permanent record
    await prisma.chatMessage.create({
      data: {
        sessionId,
        ...message,
        messageId
      }
    });

    return messageId;
  }

  static async endChatSession(sessionId: string) {
    const messages = await redis.hgetall(`${sessionId}:messages`);
    
    // Archive chat session
    await prisma.chatSession.create({
      data: {
        sessionId,
        messages: Object.values(messages).map(m => JSON.parse(m))
      }
    });

    // Clean up Redis
    await redis.del(sessionId, `${sessionId}:messages`);
  }

  // FAQ Management
  static async createFAQCategory(data: FAQCategory) {
    return prisma.faqCategory.create({
      data: {
        ...data,
        order: data.order || 0
      }
    });
  }

  static async createFAQItem(data: FAQItem) {
    const faq = await prisma.faqItem.create({
      data: {
        ...data,
        order: data.order || 0
      }
    });

    // Clear cache
    await CacheService.delete('faqs', 'support');

    return faq;
  }

  static async getFAQs() {
    return CacheService.getOrSet(
      'faqs',
      async () => {
        const categories = await prisma.faqCategory.findMany({
          include: {
            items: {
              orderBy: { order: 'asc' }
            }
          },
          orderBy: { order: 'asc' }
        });
        return categories;
      },
      { namespace: 'support', ttl: 3600 }
    );
  }

  // Returns/Refunds
  static async initiateReturn(
    orderId: string,
    data: {
      reason: string;
      items: Array<{ itemId: string; quantity: number }>;
      images?: string[];
    }
  ) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true
      }
    });

    if (!order) {
      throw new Error('Order not found');
    }

    // Validate return eligibility
    const returnWindow = 14; // 14 days return window
    const orderDate = new Date(order.createdAt);
    const daysElapsed = Math.floor(
      (Date.now() - orderDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysElapsed > returnWindow) {
      throw new Error('Return window has expired');
    }

    // Create return request
    const returnRequest = await prisma.returnRequest.create({
      data: {
        orderId,
        reason: data.reason,
        items: data.items,
        images: data.images || [],
        status: 'PENDING'
      }
    });

    // Notify support team
    await NotificationService.createNotification({
      userId: 'support-team',
      type: 'NEW_RETURN',
      title: 'New Return Request',
      message: `New return request for order ${orderId}`,
      data: { returnId: returnRequest.id }
    });

    return returnRequest;
  }

  static async processReturn(
    returnId: string,
    action: 'APPROVE' | 'REJECT',
    data?: {
      refundAmount?: number;
      reason?: string;
    }
  ) {
    const returnRequest = await prisma.returnRequest.findUnique({
      where: { id: returnId },
      include: {
        order: true
      }
    });

    if (!returnRequest) {
      throw new Error('Return request not found');
    }

    if (action === 'APPROVE') {
      // Process refund
      if (data?.refundAmount) {
        await PaymentService.processRefund(
          returnRequest.order.paymentId,
          data.refundAmount
        );
      }

      // Update inventory
      for (const item of returnRequest.items) {
        await InventoryService.updateStock({
          productId: item.itemId,
          quantity: item.quantity,
          type: 'INCREMENT',
          reason: 'RETURN'
        });
      }
    }

    // Update return status
    await prisma.returnRequest.update({
      where: { id: returnId },
      data: {
        status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
        resolution: data?.reason,
        processedAt: new Date()
      }
    });

    // Notify customer
    await NotificationService.createNotification({
      userId: returnRequest.order.userId,
      type: 'RETURN_UPDATE',
      title: `Return Request ${action === 'APPROVE' ? 'Approved' : 'Rejected'}`,
      message: data?.reason || `Your return request has been ${action.toLowerCase()}`,
      data: { returnId }
    });
  }

  // Customer Feedback
  static async submitFeedback(data: {
    userId: string;
    type: 'PRODUCT' | 'SERVICE' | 'WEBSITE';
    rating: number;
    comment: string;
    metadata?: Record<string, any>;
  }) {
    const feedback = await prisma.feedback.create({
      data
    });

    // For low ratings, create support ticket
    if (data.rating <= 2) {
      await this.createTicket({
        userId: data.userId,
        subject: `Low Rating Feedback - ${data.type}`,
        message: data.comment,
        priority: 'HIGH'
      });
    }

    return feedback;
  }

  static async getFeedbackAnalytics(
    startDate: Date,
    endDate: Date
  ) {
    const [ratings, types] = await Promise.all([
      // Rating distribution
      prisma.feedback.groupBy({
        where: {
          createdAt: { gte: startDate, lte: endDate }
        },
        by: ['rating'],
        _count: true
      }),

      // Feedback by type
      prisma.feedback.groupBy({
        where: {
          createdAt: { gte: startDate, lte: endDate }
        },
        by: ['type'],
        _count: true,
        _avg: {
          rating: true
        }
      })
    ]);

    return {
      ratingDistribution: ratings.reduce((acc, r) => {
        acc[r.rating] = r._count;
        return acc;
      }, {} as Record<number, number>),
      byType: types.reduce((acc, t) => {
        acc[t.type] = {
          count: t._count,
          averageRating: t._avg.rating
        };
        return acc;
      }, {} as Record<string, { count: number; averageRating: number }>)
    };
  }
}