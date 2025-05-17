import { CategoryForm } from '@/components/admin/categories/CategoryForm';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';

interface Props {
  params: {
    id: string;
  };
}

export default async function EditCategoryPage({ params }: Props) {
  const category = await prisma.category.findUnique({
    where: { id: params.id }
  });

  if (!category) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="md:flex md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Edit Category
          </h2>
        </div>
      </div>

      <CategoryForm 
        initialData={category}
        isEditing
      />
    </div>
  );
}