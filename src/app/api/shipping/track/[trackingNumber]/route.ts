import { NextResponse } from 'next/server';
import { ShippingService } from '@/lib/shipping/ShippingService';

export async function GET(
  request: Request,
  { params }: { params: { trackingNumber: string } }
) {
  try {
    const trackingInfo = await ShippingService.trackShipment(
      params.trackingNumber
    );

    return NextResponse.json({ tracking: trackingInfo });
  } catch (error) {
    console.error('Shipping tracking error:', error);
    return NextResponse.json(
      { error: 'Failed to track shipment' },
      { status: 500 }
    );
  }
}