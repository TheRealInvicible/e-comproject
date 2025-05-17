import Image from 'next/image';
import { Product } from '@prisma/client';
import { formatCurrency } from '@/lib/utils';
import { AddToCartButton } from './AddToCartButton';
import { WishlistButton } from './WishlistButton';
import Link from 'next/link';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <div className="group relative bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
      {/* Wishlist Button */}
      <div className="absolute top-2 right-2 z-10">
        <WishlistButton productId={product.id} />
      </div>

      {/* Product Image */}
      <Link href={`/products/${product.id}`}>
        <div className="relative aspect-square overflow-hidden rounded-t-lg">
          <Image
            src={product.images[0] || '/placeholder.png'}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>
      </Link>

      {/* Product Info */}
      <div className="p-4">
        <Link href={`/products/${product.id}`}>
          <h3 className="text-lg font-semibold text-gray-900 mb-2 hover:text-primary">
            {product.name}
          </h3>
        </Link>

        {/* Category */}
        <div className="mb-2">
          <span className="text-sm text-gray-500">
            {product.category}
          </span>
        </div>

        {/* Price */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-xl font-bold text-gray-900">
              {formatCurrency(product.price)}
            </span>
            {product.compareAtPrice && (
              <span className="ml-2 text-sm text-gray-500 line-through">
                {formatCurrency(product.compareAtPrice)}
              </span>
            )}
          </div>

          {/* Stock Status */}
          {product.stockQuantity > 0 ? (
            <span className="text-sm text-green-600">In Stock</span>
          ) : (
            <span className="text-sm text-red-600">Out of Stock</span>
          )}
        </div>

        {/* Add to Cart Button */}
        <AddToCartButton 
          productId={product.id} 
          disabled={product.stockQuantity === 0}
        />
      </div>
    </div>
  );
}