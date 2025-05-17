'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { formatCurrency } from '@/lib/utils';

interface TopProduct {
  id: string;
  name: string;
  price: number;
  image: string | null;
  totalSold: number;
  reviewCount: number;
}

export function TopProducts() {
  const [products, setProducts] = useState<TopProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch('/api/dashboard/top-products');
        const data = await response.json();
        setProducts(data);
      } catch (error) {
        console.error('Failed to fetch top products:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, []);

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="p-6">
        <h3 className="text-base font-semibold leading-6 text-gray-900">
          Top Products
        </h3>
        
        <div className="mt-6">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-16 bg-gray-100 rounded"></div>
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-gray-500">No products data available</p>
            </div>
          ) : (
            <div className="flow-root">
              <ul role="list" className="-my-5 divide-y divide-gray-200">
                {products.map((product) => (
                  <li key={product.id} className="py-5">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className="relative h-12 w-12">
                          <Image
                            src={product.image || '/placeholder-product.png'}
                            alt=""
                            fill
                            className="rounded-lg object-cover"
                          />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {product.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {product.totalSold} sold • {product.reviewCount} reviews
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        <p className="text-sm font-medium text-gray-900">
                          {formatCurrency(product.price)}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        <Link
                          href={`/admin/products/${product.id}`}
                          className="text-sm font-medium text-primary hover:text-primary-dark"
                        >
                          View
                        </Link>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                <Link
                  href="/admin/products"
                  className="w-full flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  View All Products
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}