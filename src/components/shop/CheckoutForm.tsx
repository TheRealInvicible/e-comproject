'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useCart } from '@/lib/cart/CartContext';
import { PaymentSection } from './checkout/PaymentSection';
import { ShippingSection } from './checkout/ShippingSection';
import { BillingSection } from './checkout/BillingSection';

interface CheckoutFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
  };
  billingAddress: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
  };
  sameAsShipping: boolean;
  paymentMethod: 'card' | 'bank-transfer';
}

export function CheckoutForm() {
  const { state: cart } = useCart();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm<CheckoutFormData>();

  const sameAsShipping = watch('sameAsShipping');

  const onSubmit = async (data: CheckoutFormData) => {
    setIsSubmitting(true);
    try {
      // Process shipping info
      const shippingDetails = {
        ...data.shippingAddress,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone
      };

      // Process billing info
      const billingDetails = sameAsShipping 
        ? shippingDetails 
        : data.billingAddress;

      // Create order
      const orderResponse = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.items,
          shipping: shippingDetails,
          billing: billingDetails,
          paymentMethod: data.paymentMethod
        })
      });

      if (!orderResponse.ok) {
        throw new Error('Failed to create order');
      }

      const order = await orderResponse.json();

      // Handle payment based on method
      if (data.paymentMethod === 'card') {
        // Redirect to payment gateway
        window.location.href = order.paymentUrl;
      } else {
        // Show bank transfer details
        window.location.href = `/orders/${order.id}/payment`;
      }
    } catch (error) {
      console.error('Checkout error:', error);
      // Handle error appropriately
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Shipping Information */}
      <ShippingSection 
        register={register}
        errors={errors}
        isActive={currentStep === 1}
        onComplete={() => setCurrentStep(2)}
      />

      {/* Billing Information */}
      <BillingSection
        register={register}
        errors={errors}
        sameAsShipping={sameAsShipping}
        isActive={currentStep === 2}
        onComplete={() => setCurrentStep(3)}
      />

      {/* Payment Method */}
      <PaymentSection
        register={register}
        errors={errors}
        isActive={currentStep === 3}
      />

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-primary text-white py-3 px-6 rounded-lg hover:bg-primary-dark transition-colors disabled:bg-gray-400"
      >
        {isSubmitting ? 'Processing...' : 'Complete Order'}
      </button>
    </form>
  );
}