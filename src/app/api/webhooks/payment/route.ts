import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { PaymentIntegration } from '@/lib/payment/PaymentIntegration';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';

// Verify PayStack webhook signature
function verifyPaystackSignature(
  payload: string,
  signature: string
): boolean {
  const hash = crypto
    .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!)
    .update(payload)
    .digest('hex');
  return hash === signature;
}

// Verify Flutterwave webhook signature
function verifyFlutterwaveSignature(
  payload: string,
  signature: string
): boolean {
  const hash = crypto
    .createHmac('sha256', process.env.FLUTTERWAVE_SECRET_HASH!)
    .update(payload)
    .digest('hex');
  return hash === signature;
}

export async function POST(request: Request) {
  try {
    const payload = await request.text();
    const provider = request.headers.get('x-payment-provider');
    const signature = request.headers.get('x-webhook-signature');

    if (!provider || !signature) {
      return NextResponse.json(
        { error: 'Missing required headers' },
        { status: 400 }
      );
    }

    // Verify webhook signature based on provider
    let isValid = false;
    switch (provider) {
      case 'paystack':
        isValid = verifyPaystackSignature(payload, signature);
        break;
      case 'flutterwave':
        isValid = verifyFlutterwaveSignature(payload, signature);
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid payment provider' },
          { status: 400 }
        );
    }

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Parse payload
    const data = JSON.parse(payload);

    // Prevent duplicate webhook processing
    const webhookKey = `webhook:${provider}:${data.id}`;
    const isProcessed = await redis.get(webhookKey);
    if (isProcessed) {
      return NextResponse.json({ message: 'Webhook already processed' });
    }

    // Process webhook based on provider and event type
    switch (provider) {
      case 'paystack':
        await handlePaystackWebhook(data);
        break;
      case 'flutterwave':
        await handleFlutterwaveWebhook(data);
        break;
    }

    // Mark webhook as processed
    await redis.set(webhookKey, '1', 'EX', 86400); // 24 hours expiry

    return NextResponse.json({ message: 'Webhook processed successfully' });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handlePaystackWebhook(data: any) {
  const event = data.event;
  const reference = data.data.reference;

  switch (event) {
    case 'charge.success':
      await PaymentIntegration.verifyPayment({
        reference,
        provider: 'paystack'
      });
      break;

    case 'refund.processed':
      await prisma.refund.updateMany({
        where: {
          payment: {
            providerReference: reference
          }
        },
        data: {
          status: 'SUCCESSFUL',
          processedAt: new Date()
        }
      });
      break;

    // Handle other PayStack events
  }
}

async function handleFlutterwaveWebhook(data: any) {
  const event = data.event;
  const reference = data.data.tx_ref;

  switch (event) {
    case 'charge.completed':
      await PaymentIntegration.verifyPayment({
        reference,
        provider: 'flutterwave'
      });
      break;

    case 'refund.completed':
      await prisma.refund.updateMany({
        where: {
          payment: {
            providerReference: reference
          }
        },
        data: {
          status: 'SUCCESSFUL',
          processedAt: new Date()
        }
      });
      break;

    // Handle other Flutterwave events
  }
}