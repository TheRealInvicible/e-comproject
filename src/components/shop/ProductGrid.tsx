import { ProductCard } from './ProductCard';
import { getFilteredProducts } from '@/lib/products';

interface ProductGridProps {
  searchParams: { [key: string]: string | string[] | undefined }
}

export async function ProductGrid({ searchParams }: ProductGridProps) {
  const products = await getFilteredProducts(searchParams);

  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-semibold">No products found</h3>
        <p className="text-gray-600 mt-2">Try adjusting your filters or search terms</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}