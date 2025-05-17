'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { StarIcon } from '@heroicons/react/20/solid';
import { ReviewForm } from './ReviewForm';

interface Review {
  id: string;
  rating: number;
  comment: string;
  createdAt: Date;
  user: {
    name: string;
    image: string | null;
  };
}

interface ProductReviewsProps {
  reviews: Review[];
  productId: string;
}

export function ProductReviews({ reviews, productId }: ProductReviewsProps) {
  const { data: session } = useSession();
  const [showReviewForm, setShowReviewForm] = useState(false);

  const averageRating = reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Customer Reviews</h2>

      {/* Average Rating */}
      <div className="flex items-center mb-6">
        <div className="flex items-center">
          {[1, 2, 3, 4, 5].map((rating) => (
            <StarIcon
              key={rating}
              className={`h-5 w-5 ${
                rating <= averageRating
                  ? 'text-yellow-400'
                  : 'text-gray-200'
              }`}
            />
          ))}
        </div>
        <span className="ml-2 text-sm text-gray-500">
          Based on {reviews.length} reviews
        </span>
      </div>

      {/* Add Review Button */}
      {session?.user && !showReviewForm && (
        <button
          onClick={() => setShowReviewForm(true)}
          className="mb-6 text-primary hover:text-primary-dark"
        >
          Write a Review
        </button>
      )}

      {/* Review Form */}
      {showReviewForm && (
        <ReviewForm
          productId={productId}
          onCancel={() => setShowReviewForm(false)}
          onSuccess={() => {
            setShowReviewForm(false);
            // Refresh reviews
          }}
        />
      )}

      {/* Reviews List */}
      <div className="space-y-6">
        {reviews.map((review) => (
          <div key={review.id} className="border-b pb-6">
            <div className="flex items-center mb-2">
              {/* User Avatar */}
              {review.user.image && (
                <img
                  src={review.user.image}
                  alt={review.user.name}
                  className="h-8 w-8 rounded-full"
                />
              )}
              
              <div className="ml-3">
                <p className="font-medium text-gray-900">{review.user.name}</p>
                <div className="flex items-center">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <StarIcon
                      key={rating}
                      className={`h-4 w-4 ${
                        rating <= review.rating
                          ? 'text-yellow-400'
                          : 'text-gray-200'
                      }`}
                    />
                  ))}
                </div>
              </div>
              
              <span className="ml-auto text-sm text-gray-500">
                {new Date(review.createdAt).toLocaleDateString()}
              </span>
            </div>
            
            <p className="text-gray-700 mt-2">{review.comment}</p>
          </div>
        ))}
      </div>
    </div>
  );
}