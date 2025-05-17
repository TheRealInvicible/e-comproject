'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '@/lib/cart/CartContext';
import { formatCurrency } from '@/lib/utils';
import { Product, WishlistItem } from '@prisma/client';

interface WishlistGridProps {
  items: (WishlistItem & {
    product: Product & {
      category: {
        name: string;
      };
    };
  })[];
}

export function WishlistGrid({ items }: WishlistGridProps) {
  const { dispatch } = useCart();

  const handleRemoveFromWishlist = async (itemId: string) => {
    try {
      const response = await fetch(`/api/wishlist/${itemId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to remove from wishlist');
      }

      // Refresh the page to show updated list
      window.location.reload();
    } catch (error) {
      console.error('Remove from wishlist error:', error);
      // Handle error (show error message)
    }
  };

  const handleAddToCart = (product: Product) => {
    dispatch({
      type: 'ADD_ITEM',
      payload: {
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
        image: product.images[0]
      }
    });
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900">
          Your wishlist is empty
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Add items to your wishlist while shopping
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {items.map((item) => (
        <div
          key={item.id}
          className="bg-white shadow rounded-lg overflow-hidden group"
        >
          <Link href={`/products/${item.product.id}`}>
            <div className="relative aspect-square">
              <Image
                src={item.product.images[0]}
                alt={item.product.name}
                fill
                className="object-cover group-hover:scale-105 transition-transform"
              />
            </div>
          </Link>

          <div className="p-4">
            <Link href={`/products/${item.product.id}`}>
              <h3 className="text-lg font-medium text-gray-900 group-hover:text-primary">
                {item.product.name}
              </h3>
            </Link>
            <p className="mt-1 text-sm text-gray-500">
              {item.product.category.name}
            </p>
            <p className="mt-2 text-lg font-bold text-gray-900">
              {formatCurrency(item.product.price)}
            </p>

            <div className="mt-4 flex space-x-4">
              <button
                onClick={() => handleAddToCart(item.product)}
                disabled={item.product.stockQuantity === 0}
                className="flex-1 bg-primary text-white py-2 px-4 rounded-md hover:bg-primary-dark transition-colors disabled:bg-gray-400"
              >
                Add to Cart
              </button>
              <button
                onClick={() => handleRemoveFromWishlist(item.id)}
                className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}