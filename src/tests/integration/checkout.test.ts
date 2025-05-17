import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import { prisma } from '@/lib/prisma';
import { checkout } from '@/app/api/checkout/route';
import { redis } from '@/lib/redis';

describe('Checkout Integration Tests', () => {
  beforeAll(async () => {
    // Setup test database
    await prisma.$connect();
    // Clear Redis
    await redis.flushall();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await redis.quit();
  });

  it('should process checkout successfully', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        items: [
          { productId: 'test-product', quantity: 1 }
        ],
        shippingAddress: {
          street: '123 Test St',
          city: 'Test City',
          state: 'Test State',
          postalCode: '12345'
        },
        paymentMethod: 'CARD'
      }
    });

    await checkout(req, res);

    expect(res._getStatusCode()).toBe(200);
    
    const data = JSON.parse(res._getData());
    expect(data).toHaveProperty('orderId');
    expect(data).toHaveProperty('paymentUrl');
  });

  it('should validate stock before checkout', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        items: [
          { productId: 'out-of-stock-product', quantity: 1 }
        ],
        shippingAddress: {
          street: '123 Test St',
          city: 'Test City',
          state: 'Test State',
          postalCode: '12345'
        },
        paymentMethod: 'CARD'
      }
    });

    await checkout(req, res);

    expect(res._getStatusCode()).toBe(400);
    
    const data = JSON.parse(res._getData());
    expect(data.error).toBe('Insufficient stock');
  });

  it('should calculate shipping correctly', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        items: [
          { productId: 'test-product', quantity: 2 }
        ],
        shippingAddress: {
          street: '123 Test St',
          city: 'Test City',
          state: 'Lagos',
          postalCode: '12345'
        },
        paymentMethod: 'CARD'
      }
    });

    await checkout(req, res);

    expect(res._getStatusCode()).toBe(200);
    
    const data = JSON.parse(res._getData());
    expect(data.orderDetails.shipping).toBe(1500); // Base rate for Lagos
  });

  it('should apply discounts correctly', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        items: [
          { productId: 'test-product', quantity: 1 }
        ],
        shippingAddress: {
          street: '123 Test St',
          city: 'Test City',
          state: 'Test State',
          postalCode: '12345'
        },
        paymentMethod: 'CARD',
        couponCode: 'TEST10'
      }
    });

    await checkout(req, res);

    expect(res._getStatusCode()).toBe(200);
    
    const data = JSON.parse(res._getData());
    expect(data.orderDetails.discount).toBe(100); // 10% of 1000
  });

  it('should handle payment failure gracefully', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        items: [
          { productId: 'test-product', quantity: 1 }
        ],
        shippingAddress: {
          street: '123 Test St',
          city: 'Test City',
          state: 'Test State',
          postalCode: '12345'
        },
        paymentMethod: 'FAILED_CARD'
      }
    });

    await checkout(req, res);

    expect(res._getStatusCode()).toBe(400);
    
    const data = JSON.parse(res._getData());
    expect(data.error).toBe('Payment initialization failed');
  });
});