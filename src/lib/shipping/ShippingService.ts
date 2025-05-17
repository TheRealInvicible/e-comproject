export interface ShippingZone {
  id: string;
  name: string;
  states: string[];
  baseRate: number;
  ratePerKg: number;
  freeShippingThreshold?: number;
}

export interface ShippingOption {
  id: string;
  name: string;
  price: number;
  estimatedDays: string;
}

export class ShippingService {
  private static shippingZones: ShippingZone[] = [
    {
      id: 'zone1',
      name: 'Lagos Zone',
      states: ['Lagos'],
      baseRate: 1500,
      ratePerKg: 100,
      freeShippingThreshold: 50000
    },
    {
      id: 'zone2',
      name: 'South West Zone',
      states: ['Ogun', 'Oyo', 'Osun', 'Ondo', 'Ekiti'],
      baseRate: 2000,
      ratePerKg: 150
    },
    {
      id: 'zone3',
      name: 'Other States',
      states: ['*'],
      baseRate: 2500,
      ratePerKg: 200
    }
  ];

  static calculateShippingOptions(
    state: string,
    totalWeight: number,
    orderTotal: number
  ): ShippingOption[] {
    const zone = this.getShippingZone(state);
    const baseShipping = this.calculateBaseShipping(zone, totalWeight);

    // Check for free shipping
    if (zone.freeShippingThreshold && orderTotal >= zone.freeShippingThreshold) {
      return [
        {
          id: 'free',
          name: 'Free Shipping',
          price: 0,
          estimatedDays: '3-5 business days'
        }
      ];
    }

    return [
      {
        id: 'standard',
        name: 'Standard Shipping',
        price: baseShipping,
        estimatedDays: '3-5 business days'
      },
      {
        id: 'express',
        name: 'Express Shipping',
        price: baseShipping * 1.5,
        estimatedDays: '1-2 business days'
      }
    ];
  }

  private static getShippingZone(state: string): ShippingZone {
    return (
      this.shippingZones.find(zone => zone.states.includes(state)) ||
      this.shippingZones.find(zone => zone.states.includes('*'))!
    );
  }

  private static calculateBaseShipping(
    zone: ShippingZone,
    totalWeight: number
  ): number {
    return zone.baseRate + (totalWeight * zone.ratePerKg);
  }

  static async trackShipment(trackingNumber: string) {
    // Implement shipment tracking logic here
    // This would typically integrate with a shipping provider's API
    return {
      status: 'in_transit',
      location: 'Lagos Sorting Center',
      estimatedDelivery: '2023-05-20',
      events: [
        {
          date: '2023-05-18T10:00:00Z',
          location: 'Lagos Warehouse',
          status: 'Package picked up'
        }
        // Add more tracking events
      ]
    };
  }
}