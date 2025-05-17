'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ImagePlus, X, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';

interface Category {
  id: string;
  name: string;
}

interface ProductFormProps {
  initialData?: any;
  isEditing?: boolean;
}

export function ProductForm({ initialData, isEditing = false }: ProductFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    salePrice: '',
    stockQuantity: '',
    brand: '',
    weight: '',
    dimensions: '',
    categoryIds: [] as string[],
    specifications: {} as Record<string, string>,
    images: [] as string[],
    status: 'ACTIVE',
    ...initialData
  });

  useEffect(() => {
    // Fetch categories
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/categories');
        const data = await response.json();
        setCategories(data);
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      }
    };

    fetchCategories();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const url = isEditing 
        ? \`/api/products/\${initialData.id}\`
        : '/api/products';
      
      const response = await fetch(url, {
        method: isEditing ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to save product');
      }

      router.push('/admin/products');
      router.refresh();
    } catch (error) {
      console.error('Error saving product:', error);
      // Add error handling/notification here
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    // Here you would typically upload to your storage service
    // For now, we'll just create object URLs as placeholders
    const newImages = Array.from(files).map(file => URL.createObjectURL(file));
    setFormData(prev => ({
      ...prev,
      images: [...prev.images, ...newImages]
    }));
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const addSpecification = () => {
    const key = prompt('Enter specification key');
    const value = prompt('Enter specification value');
    
    if (key && value) {
      setFormData(prev => ({
        ...prev,
        specifications: {
          ...prev.specifications,
          [key]: value
        }
      }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Basic Information */}
      <div className="bg-white shadow-sm rounded-lg p-6">
        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-6">
          Basic Information
        </h3>
        
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Product Name
            </label>
            <input
              type="text"
              id="name"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
              value={formData.name}
              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>

          <div>
            <label htmlFor="brand" className="block text-sm font-medium text-gray-700">
              Brand
            </label>
            <input
              type="text"
              id="brand"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
              value={formData.brand}
              onChange={e => setFormData(prev => ({ ...prev, brand: e.target.value }))}
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              id="description"
              rows={4}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
              value={formData.description}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>

          <div>
            <label htmlFor="price" className="block text-sm font-medium text-gray-700">
              Price (₦)
            </label>
            <input
              type="number"
              id="price"
              required
              min="0"
              step="0.01"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
              value={formData.price}
              onChange={e => setFormData(prev => ({ ...prev, price: e.target.value }))}
            />
          </div>

          <div>
            <label htmlFor="salePrice" className="block text-sm font-medium text-gray-700">
              Sale Price (₦)
            </label>
            <input
              type="number"
              id="salePrice"
              min="0"
              step="0.01"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
              value={formData.salePrice}
              onChange={e => setFormData(prev => ({ ...prev, salePrice: e.target.value }))}
            />
          </div>

          <div>
            <label htmlFor="stockQuantity" className="block text-sm font-medium text-gray-700">
              Stock Quantity
            </label>
            <input
              type="number"
              id="stockQuantity"
              required
              min="0"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
              value={formData.stockQuantity}
              onChange={e => setFormData(prev => ({ ...prev, stockQuantity: e.target.value }))}
            />
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700">
              Status
            </label>
            <select
              id="status"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
              value={formData.status}
              onChange={e => setFormData(prev => ({ ...prev, status: e.target.value }))}
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="OUT_OF_STOCK">Out of Stock</option>
            </select>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="bg-white shadow-sm rounded-lg p-6">
        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-6">
          Categories
        </h3>
        
        <div className="space-y-4">
          {categories.map(category => (
            <label key={category.id} className="inline-flex items-center mr-6">
              <input
                type="checkbox"
                className="rounded border-gray-300 text-primary focus:ring-primary"
                checked={formData.categoryIds.includes(category.id)}
                onChange={e => {
                  const isChecked = e.target.checked;
                  setFormData(prev => ({
                    ...prev,
                    categoryIds: isChecked
                      ? [...prev.categoryIds, category.id]
                      : prev.categoryIds.filter(id => id !== category.id)
                  }));
                }}
              />
              <span className="ml-2">{category.name}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Images */}
      <div className="bg-white shadow-sm rounded-lg p-6">
        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-6">
          Product Images
        </h3>
        
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {formData.images.map((image, index) => (
            <div key={index} className="relative">
              <div className="aspect-square relative rounded-lg overflow-hidden">
                <Image
                  src={image}
                  alt=""
                  fill
                  className="object-cover"
                />
              </div>
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
          
          <label className="aspect-square relative border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary">
            <input
              type="file"
              multiple
              accept="image/*"
              className="sr-only"
              onChange={handleImageUpload}
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <ImagePlus className="h-8 w-8 text-gray-400" />
              <span className="mt-2 text-sm text-gray-500">Add Image</span>
            </div>
          </label>
        </div>
      </div>

      {/* Specifications */}
      <div className="bg-white shadow-sm rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900">
            Specifications
          </h3>
          <Button
            type="button"
            variant="outline"
            onClick={addSpecification}
          >
            Add Specification
          </Button>
        </div>
        
        <div className="space-y-4">
          {Object.entries(formData.specifications).map(([key, value]) => (
            <div key={key} className="flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700">
                  {key}
                </label>
                <input
                  type="text"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                  value={value}
                  onChange={e => setFormData(prev => ({
                    ...prev,
                    specifications: {
                      ...prev.specifications,
                      [key]: e.target.value
                    }
                  }))}
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  const { [key]: _, ...rest } = formData.specifications;
                  setFormData(prev => ({
                    ...prev,
                    specifications: rest
                  }));
                }}
                className="mt-6 text-red-500 hover:text-red-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEditing ? 'Update Product' : 'Create Product'}
        </Button>
      </div>
    </form>
  );
}