import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { ProductDetails } from '@/components/shop/product/ProductDetails';
import { ProductReviews } from '@/components/shop/product/ProductReviews';
import { RelatedProducts } from '@/components/shop/product/RelatedProducts';
import { LoadingProduct } from '@/components/ui/loading';

interface ProductPageProps {
  params: {
    id: string;
  };
}

async function getProduct(id: string) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      reviews: {
        include: {
          user: {
            select: {
              name: true,
              image: true
            }
          }
        }
      }
    }
  });

  if (!product) {
    notFound();
  }

  return product;
}

export async function generateMetadata({ params }: ProductPageProps) {
  const product = await getProduct(params.id);
  
  return {
    title: `${product.name} | Dominion Store`,
    description: product.description,
    openGraph: {
      images: product.images,
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const product = await getProduct(params.id);

  return (
    <div className="container mx-auto px-4 py-8">
      <Suspense fallback={<LoadingProduct />}>
        {/* Product Details Section */}
        <ProductDetails product={product} />

        {/* Product Reviews Section */}
        <div className="mt-16">
          <ProductReviews 
            reviews={product.reviews}
            productId={product.id}
          />
        </div>

        {/* Related Products Section */}
        <div className="mt-16">
          <RelatedProducts 
            categoryId={product.categoryId}
            currentProductId={product.id}
          />
        </div>
      </Suspense>
    </div>
  );
}