import { ProductForm } from '@/components/admin/products/ProductForm';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';

interface Props {
  params: {
    id: string;
  };
}

export default async function EditProductPage({ params }: Props) {
  const product = await prisma.product.findUnique({
    where: { id: params.id },
    include: {
      categories: {
        select: {
          category: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }
    }
  });

  if (!product) {
    notFound();
  }

  // Transform the data to match the form structure
  const formData = {
    ...product,
    categoryIds: product.categories.map(cp => cp.category.id)
  };

  return (
    <div className="space-y-6">
      <div className="md:flex md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Edit Product
          </h2>
        </div>
      </div>

      <ProductForm 
        initialData={formData}
        isEditing
      />
    </div>
  );
}