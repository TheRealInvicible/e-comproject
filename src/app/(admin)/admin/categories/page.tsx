import { CategoryList } from '@/components/admin/categories/CategoryList';
import { Button } from '@/components/ui/Button';
import { Plus } from 'lucide-react';
import Link from 'next/link';

export default function CategoriesPage() {
  return (
    <div className="space-y-6">
      <div className="md:flex md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Categories
          </h2>
        </div>
        <div className="mt-4 flex md:ml-4 md:mt-0">
          <Link href="/admin/categories/new">
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Category
            </Button>
          </Link>
        </div>
      </div>

      <CategoryList />
    </div>
  );
}