'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useCart } from '@/lib/cart/CartContext';
import { formatCurrency } from '@/lib/utils';
import { Product } from '@prisma/client';
import { WishlistButton } from '../WishlistButton';
import { ProductQuantity } from './ProductQuantity';

interface ProductDetailsProps {
  product: Product & {
    category: {
      name: string;
    };
  };
}

export function ProductDetails({ product }: ProductDetailsProps) {
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const { dispatch } = useCart();

  const handleAddToCart = () => {
    dispatch({
      type: 'ADD_ITEM',
      payload: {
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity,
        image: product.images[0]
      }
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* Product Images */}
      <div className="space-y-4">
        <div className="relative aspect-square rounded-lg overflow-hidden">
          <Image
            src={product.images[selectedImage]}
            alt={product.name}
            fill
            className="object-cover"
            priority
          />
        </div>
        
        {/* Thumbnail Gallery */}
        <div className="grid grid-cols-4 gap-2">
          {product.images.map((image, index) => (
            <button
              key={index}
              className={`relative aspect-square rounded-md overflow-hidden ${
                selectedImage === index ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => setSelectedImage(index)}
            >
              <Image
                src={image}
                alt={`${product.name} ${index + 1}`}
                fill
                className="object-cover"
              />
            </button>
          ))}
        </div>
      </div>

      {/* Product Info */}
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
          <p className="text-sm text-gray-500 mt-1">{product.category.name}</p>
        </div>

        {/* Price */}
        <div className="flex items-center space-x-4">
          <span className="text-2xl font-bold text-gray-900">
            {formatCurrency(product.price)}
          </span>
          {product.compareAtPrice && (
            <span className="text-lg text-gray-500 line-through">
              {formatCurrency(product.compareAtPrice)}
            </span>
          )}
        </div>

        {/* Description */}
        <div className="prose prose-sm">
          <p>{product.description}</p>
        </div>

        {/* Stock Status */}
        <div>
          {product.stockQuantity > 0 ? (
            <span className="text-green-600">
              In Stock ({product.stockQuantity} available)
            </span>
          ) : (
            <span className="text-red-600">Out of Stock</span>
          )}
        </div>

        {/* Quantity Selector */}
        <ProductQuantity
          quantity={quantity}
          setQuantity={setQuantity}
          max={product.stockQuantity}
        />

        {/* Add to Cart and Wishlist */}
        <div className="flex space-x-4">
          <button
            onClick={handleAddToCart}
            disabled={product.stockQuantity === 0}
            className="flex-1 bg-primary text-white py-3 px-6 rounded-lg hover:bg-primary-dark transition-colors disabled:bg-gray-400"
          >
            Add to Cart
          </button>
          <WishlistButton productId={product.id} />
        </div>

        {/* Additional Product Info */}
        <div className="border-t pt-6 mt-6">
          <h3 className="text-lg font-semibold mb-4">Product Details</h3>
          <dl className="divide-y">
            {Object.entries(product.specifications || {}).map(([key, value]) => (
              <div key={key} className="py-3 flex">
                <dt className="w-1/3 text-gray-500">{key}</dt>
                <dd className="w-2/3 text-gray-900">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}