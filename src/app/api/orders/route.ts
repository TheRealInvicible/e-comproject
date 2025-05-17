import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { PaymentServiceFactory } from '@/lib/payment/PaymentService';
import { authOptions } from '@/lib/auth';
import { trackView, trackConversion } from '@/lib/analytics';
import { captureError } from '@/lib/errorMonitoring';
import { csrfProtection } from '@/lib/csrf';
import { rateLimiter } from '@/lib/rateLimiter';
import { validateOrderInput } from '@/lib/validation';
import { cache } from '@/lib/cache';
import { OrderWithItems, OptimizedOrder } from '@/lib/types/order';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    await csrfProtection(request);
    await rateLimiter.check(session.user.id, 'order-post');
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { items, shipping, billing, paymentMethod } = await request.json();
    const validationError = validateOrderInput({ items, shipping, billing, paymentMethod });
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const total = items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
    const order = await prisma.order.create({
      data: {
      userId: session.user.id,
          items: {
          create: items.map((item: any) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price
          }))
        },
        total,
        status: 'pending',
        paymentStatus: 'pending',
        shippingInfo: shipping,
        billingInfo: billing,
        paymentMethod
      }
    });

    const reference = `DOM-${order.id}-${Date.now()}`;

    if (paymentMethod === 'card') {
      const paymentProvider = PaymentServiceFactory.createProvider('paystack');
      await paymentProvider.initialize();

      const paymentResponse = await paymentProvider.processPayment(total, shipping.email, reference);
      await prisma.order.update({
        where: { id: order.id },
        data: { paymentReference: reference }
      });

      trackConversion(order.id, total);

      return NextResponse.json({
        success: true,
        orderId: order.id,
        paymentUrl: paymentResponse.paymentUrl
      });
    }

    trackConversion(order.id, total);
    return NextResponse.json({ success: true, orderId: order.id, reference });
  } catch (error) {
    captureError(error, 'Order creation error');
    console.error('Order creation error:', error);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');

    const cacheKey = `orders-${session.user.id}-${page}-${limit}-${status || 'all'}`;
    const where = {
      userId: session.user.id,
      ...(status && { status })
    };

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          items: {
            include: {
              product: {
                select: {
                  name: true,
                  images: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.order.count({ where })
    ]);

    const optimizedOrders: OptimizedOrder[] = (orders as OrderWithItems[]).map(order => ({
      id: order.id,
      userId: order.userId,
      total: order.total,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      paymentReference: order.paymentReference,
      shippingInfo: order.shippingInfo,
      billingInfo: order.billingInfo,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      items: order.items.map(item => ({
        id: item.id,
        productId: item.productId,
        orderId: item.orderId,
        quantity: item.quantity,
        price: item.price,
        product: {
          name: item.product.name,
          images: item.product.images.map((src: string) => optimizeImage(src))
      }
      }))
    }));

    const responseData = {
      orders: optimizedOrders,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        page,
        limit
      }
    };

    cache.set(cacheKey, responseData, 60 * 10);

    trackView(session.user.id, 'orders');

    return NextResponse.json(responseData);
  } catch (error) {
    captureError(error, 'Order fetch error');
    console.error('Order fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}

function optimizeImage(url: string): string {
  const params = new URLSearchParams();
  params.set('w', '200');
  params.set('auto', 'format');
  return `${url}?${params.toString()}`;
}
