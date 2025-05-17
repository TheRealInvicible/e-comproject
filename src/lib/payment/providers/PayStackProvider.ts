import { PaymentProvider } from '../PaymentIntegration';
import { PaymentError } from '../errors';

export class PayStackProvider implements PaymentProvider {
  private readonly secretKey: string;
  private readonly baseUrl = 'https://api.paystack.co';

  constructor() {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) {
      throw new Error('PayStack secret key not configured');
    }
    this.secretKey = secretKey;
  }

  private async makeRequest(
    endpoint: string,
    method: string = 'GET',
    data?: any
  ) {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method,
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json'
        },
        ...(data && { body: JSON.stringify(data) })
      });

      const result = await response.json();

      if (!response.ok || !result.status) {
        throw new PaymentError(result.message || 'PayStack request failed');
      }

      return result;
    } catch (error) {
      console.error('PayStack API error:', error);
      throw error;
    }
  }

  async initializePayment(data: {
    amount: number;
    email: string;
    reference: string;
    callbackUrl: string;
    metadata?: Record<string, any>;
  }) {
    try {
      const result = await this.makeRequest('/transaction/initialize', 'POST', {
        amount: Math.round(data.amount * 100), // Convert to kobo
        email: data.email,
        reference: data.reference,
        callback_url: data.callbackUrl,
        metadata: data.metadata
      });

      return {
        success: true,
        transactionId: result.data.reference,
        reference: result.data.reference,
        redirectUrl: result.data.authorization_url
      };
    } catch (error) {
      throw new PaymentError(
        error instanceof PaymentError
          ? error.message
          : 'Failed to initialize PayStack payment'
      );
    }
  }

  async verifyPayment(reference: string) {
    try {
      const result = await this.makeRequest(`/transaction/verify/${reference}`);

      return {
        success: result.data.status === 'success',
        transactionId: result.data.reference,
        reference: result.data.reference,
        message: result.data.gateway_response,
        metadata: result.data.metadata,
        amount: result.data.amount / 100 // Convert from kobo
      };
    } catch (error) {
      throw new PaymentError(
        error instanceof PaymentError
          ? error.message
          : 'Failed to verify PayStack payment'
      );
    }
  }

  async refundPayment(reference: string, amount?: number) {
    try {
      const result = await this.makeRequest('/refund', 'POST', {
        transaction: reference,
        ...(amount && { amount: Math.round(amount * 100) }) // Convert to kobo if amount provided
      });

      return {
        success: true,
        reference: result.data.reference,
        message: 'Refund processed successfully'
      };
    } catch (error) {
      throw new PaymentError(
        error instanceof PaymentError
          ? error.message
          : 'Failed to process PayStack refund'
      );
    }
  }
}