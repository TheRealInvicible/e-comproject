import { Suspense } from 'react';
import { ProductGrid } from '@/components/shop/ProductGrid';
import { ProductFilters } from '@/components/shop/ProductFilters';
import { ProductSort } from '@/components/shop/ProductSort';
import { LoadingProducts } from '@/components/ui/loading';

export const metadata = {
  title: 'Products | Dominion Store',
  description: 'Browse our collection of mother care, baby needs and adult products'
};

export default async function ProductsPage({
  searchParams
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Our Products</h1>
      
      <div className="flex flex-col md:flex-row gap-8">
        {/* Filters Sidebar */}
        <div className="w-full md:w-1/4">
          <ProductFilters />
        </div>

        {/* Product Grid */}
        <div className="w-full md:w-3/4">
          <div className="mb-4">
            <ProductSort />
          </div>
          
          <Suspense fallback={<LoadingProducts />}>
            <ProductGrid searchParams={searchParams} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}