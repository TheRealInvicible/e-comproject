import { PaymentProvider } from './types';

// PayStack implementation
export class PayStackProvider implements PaymentProvider {
  private readonly secretKey: string;
  private readonly publicKey: string;

  constructor() {
    this.secretKey = process.env.PAYSTACK_SECRET_KEY!;
    this.publicKey = process.env.PAYSTACK_PUBLIC_KEY!;
  }

  async initialize(): Promise<void> {
    // Validate configuration
    if (!this.secretKey || !this.publicKey) {
      throw new Error('PayStack configuration missing');
    }
  }

  async processPayment(amount: number, email: string, reference: string) {
    try {
      const response = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amount * 100, // Convert to kobo
          email,
          reference,
          callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/verify`,
        }),
      });

      const data = await response.json();
      
      if (!data.status) {
        throw new Error(data.message);
      }

      return {
        success: true,
        paymentUrl: data.data.authorization_url,
        reference: data.data.reference,
      };
    } catch (error) {
      console.error('PayStack payment error:', error);
      throw new Error('Payment initialization failed');
    }
  }

  async verifyPayment(reference: string) {
    try {
      const response = await fetch(
        `https://api.paystack.co/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
          },
        }
      );

      const data = await response.json();

      if (!data.status) {
        throw new Error(data.message);
      }

      return {
        success: true,
        verified: data.data.status === 'success',
        amount: data.data.amount / 100, // Convert from kobo
        reference: data.data.reference,
        transactionId: data.data.id,
      };
    } catch (error) {
      console.error('PayStack verification error:', error);
      throw new Error('Payment verification failed');
    }
  }
}

// Flutterwave implementation
export class FlutterwaveProvider implements PaymentProvider {
  private readonly secretKey: string;
  private readonly publicKey: string;

  constructor() {
    this.secretKey = process.env.FLUTTERWAVE_SECRET_KEY!;
    this.publicKey = process.env.FLUTTERWAVE_PUBLIC_KEY!;
  }

  async initialize(): Promise<void> {
    if (!this.secretKey || !this.publicKey) {
      throw new Error('Flutterwave configuration missing');
    }
  }

  async processPayment(amount: number, email: string, reference: string) {
    try {
      const response = await fetch('https://api.flutterwave.com/v3/payments', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tx_ref: reference,
          amount,
          currency: 'NGN',
          redirect_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/verify`,
          customer: {
            email,
          },
        }),
      });

      const data = await response.json();

      if (!data.status) {
        throw new Error(data.message);
      }

      return {
        success: true,
        paymentUrl: data.data.link,
        reference: data.data.tx_ref,
      };
    } catch (error) {
      console.error('Flutterwave payment error:', error);
      throw new Error('Payment initialization failed');
    }
  }

  async verifyPayment(reference: string) {
    try {
      const response = await fetch(
        `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${reference}`,
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
          },
        }
      );

      const data = await response.json();

      if (!data.status) {
        throw new Error(data.message);
      }

      return {
        success: true,
        verified: data.data.status === 'successful',
        amount: data.data.amount,
        reference: data.data.tx_ref,
        transactionId: data.data.id,
      };
    } catch (error) {
      console.error('Flutterwave verification error:', error);
      throw new Error('Payment verification failed');
    }
  }
}

// Factory to create payment provider instances
export class PaymentServiceFactory {
  static createProvider(provider: 'paystack' | 'flutterwave'): PaymentProvider {
    switch (provider) {
      case 'paystack':
        return new PayStackProvider();
      case 'flutterwave':
        return new FlutterwaveProvider();
      default:
        throw new Error(`Unsupported payment provider: ${provider}`);
    }
  }
}