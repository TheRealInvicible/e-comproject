import { Suspense } from 'react';
import { CheckoutForm } from '@/components/shop/CheckoutForm';
import { OrderSummary } from '@/components/shop/OrderSummary';
import { LoadingCheckout } from '@/components/ui/loading';

export const metadata = {
  title: 'Checkout | Dominion Store',
  description: 'Complete your purchase'
};

export default function CheckoutPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Checkout Form */}
        <div>
          <Suspense fallback={<LoadingCheckout />}>
            <CheckoutForm />
          </Suspense>
        </div>

        {/* Order Summary */}
        <div>
          <OrderSummary />
        </div>
      </div>
    </div>
  );
}