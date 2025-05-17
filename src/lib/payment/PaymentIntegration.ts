import { PayStackProvider } from './providers/PayStackProvider';
import { FlutterwaveProvider } from './providers/FlutterwaveProvider';
import { MonnifyProvider } from './providers/MonnifyProvider';
import { KudaProvider } from './providers/KudaProvider';
import { PaymentError } from './errors';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';

export type PaymentProvider = 'paystack' | 'flutterwave' | 'monnify' | 'kuda';

export interface PaymentInitialization {
  amount: number;
  email: string;
  reference: string;
  metadata?: Record<string, any>;
  callbackUrl: string;
}

export interface PaymentVerification {
  reference: string;
  provider: PaymentProvider;
}

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  reference?: string;
  message?: string;
  metadata?: Record<string, any>;
}

export class PaymentIntegration {
  private static providers = {
    paystack: new PayStackProvider(),
    flutterwave: new FlutterwaveProvider(),
    monnify: new MonnifyProvider(),
    kuda: new KudaProvider()
  };

  static async initializePayment(
    provider: PaymentProvider,
    data: PaymentInitialization
  ): Promise<PaymentResult> {
    try {
      // Rate limiting check
      const rateLimitKey = `ratelimit:payment:${data.email}`;
      const attempts = await redis.incr(rateLimitKey);
      
      if (attempts === 1) {
        await redis.expire(rateLimitKey, 3600); // 1 hour expiry
      }

      if (attempts > 10) {
        throw new PaymentError('Too many payment attempts. Please try again later.');
      }

      // Create payment record
      const payment = await prisma.payment.create({
        data: {
          provider,
          amount: data.amount,
          reference: data.reference,
          email: data.email,
          status: 'PENDING',
          metadata: data.metadata
        }
      });

      // Initialize payment with provider
      const result = await this.providers[provider].initializePayment(data);

      // Update payment record
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          providerReference: result.reference,
          status: 'INITIALIZED'
        }
      });

      return result;
    } catch (error) {
      console.error('Payment initialization error:', error);
      throw new PaymentError(
        error instanceof PaymentError 
          ? error.message 
          : 'Payment initialization failed'
      );
    }
  }

  static async verifyPayment(data: PaymentVerification): Promise<PaymentResult> {
    try {
      const result = await this.providers[data.provider].verifyPayment(data.reference);

      // Update payment record
      await prisma.payment.updateMany({
        where: {
          OR: [
            { reference: data.reference },
            { providerReference: data.reference }
          ]
        },
        data: {
          status: result.success ? 'SUCCESSFUL' : 'FAILED',
          verificationResponse: result
        }
      });

      if (result.success) {
        // Process successful payment
        await this.processSuccessfulPayment(data.reference);
      }

      return result;
    } catch (error) {
      console.error('Payment verification error:', error);
      throw new PaymentError('Payment verification failed');
    }
  }

  private static async processSuccessfulPayment(reference: string): Promise<void> {
    const payment = await prisma.payment.findFirst({
      where: {
        OR: [
          { reference },
          { providerReference: reference }
        ]
      },
      include: {
        order: true
      }
    });

    if (!payment) return;

    // Update order status
    if (payment.order) {
      await prisma.order.update({
        where: { id: payment.order.id },
        data: { status: 'PROCESSING' }
      });

      // Trigger order processing
      await OrderProcessor.processOrder(payment.order.id);
    }
  }

  static async refundPayment(
    transactionId: string,
    amount?: number
  ): Promise<PaymentResult> {
    const payment = await prisma.payment.findUnique({
      where: { transactionId }
    });

    if (!payment) {
      throw new PaymentError('Payment not found');
    }

    try {
      const result = await this.providers[payment.provider as PaymentProvider]
        .refundPayment(payment.providerReference, amount || payment.amount);

      // Log refund
      await prisma.refund.create({
        data: {
          paymentId: payment.id,
          amount: amount || payment.amount,
          status: result.success ? 'SUCCESSFUL' : 'FAILED',
          response: result
        }
      });

      return result;
    } catch (error) {
      console.error('Payment refund error:', error);
      throw new PaymentError('Payment refund failed');
    }
  }
}