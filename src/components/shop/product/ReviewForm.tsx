'use client';

import { useState } from 'react';
import { StarIcon } from '@heroicons/react/20/solid';
import { useForm } from 'react-hook-form';

interface ReviewFormProps {
  productId: string;
  onCancel: () => void;
  onSuccess: () => void;
}

interface ReviewFormData {
  rating: number;
  comment: string;
}

export function ReviewForm({ productId, onCancel, onSuccess }: ReviewFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hoveredRating, setHoveredRating] = useState(0);
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<ReviewFormData>();
  const rating = watch('rating', 0);

  const onSubmit = async (data: ReviewFormData) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId,
          rating: data.rating,
          comment: data.comment,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit review');
      }

      onSuccess();
    } catch (error) {
      console.error('Review submission error:', error);
      // Handle error (show error message)
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mb-8 space-y-4">
      {/* Rating Stars */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Rating
        </label>
        <div className="flex">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setValue('rating', star)}
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
              className="p-1"
            >
              <StarIcon
                className={`h-6 w-6 ${
                  star <= (hoveredRating || rating)
                    ? 'text-yellow-400'
                    : 'text-gray-200'
                }`}
              />
            </button>
          ))}
        </div>
        {errors.rating && (
          <p className="mt-1 text-sm text-red-600">Please select a rating</p>
        )}
      </div>

      {/* Review Comment */}
      <div>
        <label
          htmlFor="comment"
          className="block text-sm font-medium text-gray-700"
        >
          Your Review
        </label>
        <textarea
          id="comment"
          rows={4}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
          {...register('comment', { required: true })}
        />
        {errors.comment && (
          <p className="mt-1 text-sm text-red-600">Please enter your review</p>
        )}
      </div>

      {/* Form Actions */}
      <div className="flex space-x-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 bg-primary text-white py-2 px-4 rounded-md hover:bg-primary-dark transition-colors disabled:bg-gray-400"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Review'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}