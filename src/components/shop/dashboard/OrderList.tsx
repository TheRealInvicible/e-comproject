import Link from 'next/link';
import Image from 'next/image';
import { Order } from '@prisma/client';
import { formatCurrency } from '@/lib/utils';

interface OrderListProps {
  orders: Order[];
}

export function OrderList({ orders }: OrderListProps) {
  if (orders.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900">No orders found</h3>
        <p className="mt-1 text-sm text-gray-500">
          Start shopping to see your orders here
        </p>
        <Link
          href="/products"
          className="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        >
          Browse Products
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {orders.map((order) => (
        <div
          key={order.id}
          className="bg-white shadow rounded-lg overflow-hidden"
        >
          {/* Order Header */}
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex justify-between">
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Order #{order.id}
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Placed on {new Date(order.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">
                Total: {formatCurrency(order.total)}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Status: {order.status}
              </p>
            </div>
          </div>

          {/* Order Items */}
          <div className="px-4 py-5 sm:p-6">
            <div className="space-y-4">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center">
                  <div className="flex-shrink-0 w-16 h-16 relative">
                    <Image
                      src={item.product.images[0]}
                      alt={item.product.name}
                      fill
                      className="object-cover rounded"
                    />
                  </div>
                  <div className="ml-4 flex-1">
                    <h4 className="text-sm font-medium text-gray-900">
                      {item.product.name}
                    </h4>
                    <p className="mt-1 text-sm text-gray-500">
                      Quantity: {item.quantity}
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      Price: {formatCurrency(item.price)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Order Actions */}
          <div className="px-4 py-4 sm:px-6 bg-gray-50 border-t border-gray-200">
            <div className="flex justify-end space-x-4">
              <Link
                href={`/dashboard/orders/${order.id}`}
                className="text-sm font-medium text-primary hover:text-primary-dark"
              >
                View Details
              </Link>
              {order.status === 'delivered' && (
                <button className="text-sm font-medium text-primary hover:text-primary-dark">
                  Write Review
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}