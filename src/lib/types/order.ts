import { Order, OrderItem, Product } from '@prisma/client';

export interface OrderWithItems extends Order {
  items: (OrderItem & {
    product: {
      name: string;
      images: string[];
    };
  })[];
}

export interface OptimizedOrderItem {
  id: string;
  productId: string;
  orderId: string;
  quantity: number;
  price: number;
  product: {
    name: string;
    images: string[];
  };
}

export interface OptimizedOrder {
  id: string;
  userId: string;
  total: number;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  paymentReference?: string | null;
  shippingInfo: any; // You can make this more specific based on your data structure
  billingInfo: any; // You can make this more specific based on your data structure
  createdAt: Date;
  updatedAt: Date;
  items: OptimizedOrderItem[];
}