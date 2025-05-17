import { NextResponse } from 'next/server';
import { ShippingService } from '@/lib/shipping/ShippingService';

export async function POST(request: Request) {
  try {
    const { state, items, orderTotal } = await request.json();

    // Calculate total weight
    const totalWeight = items.reduce(
      (sum: number, item: any) => sum + (item.weight * item.quantity),
      0
    );

    const shippingOptions = ShippingService.calculateShippingOptions(
      state,
      totalWeight,
      orderTotal
    );

    return NextResponse.json({ shippingOptions });
  } catch (error) {
    console.error('Shipping calculation error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate shipping' },
      { status: 500 }
    );
  }
}