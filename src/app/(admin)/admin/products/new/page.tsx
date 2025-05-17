import { ProductForm } from '@/components/admin/products/ProductForm';

export default function NewProductPage() {
  return (
    <div className="space-y-6">
      <div className="md:flex md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Add New Product
          </h2>
        </div>
      </div>

      <ProductForm />
    </div>
  );
}