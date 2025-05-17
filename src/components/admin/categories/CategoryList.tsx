'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, Edit, Trash2, ArrowUpDown, Check } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface Category {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  displayOrder: number;
  status: 'ACTIVE' | 'INACTIVE';
  parentId: string | null;
  _count: {
    products: number;
  };
}

export function CategoryList() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [sort, setSort] = useState({ field: 'displayOrder', direction: 'asc' });

  const fetchCategories = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(\`/api/categories?includeInactive=true\`);
      const data = await response.json();
      setCategories(data);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      toast.error('Failed to load categories');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleDelete = async (categoryId: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;

    try {
      const response = await fetch(\`/api/categories/\${categoryId}\`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete category');

      toast.success('Category deleted successfully');
      fetchCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Failed to delete category');
    }
  };

  const handleBulkAction = async (action: 'delete' | 'activate' | 'deactivate') => {
    if (!selectedCategories.length) return;

    if (action === 'delete' && !confirm('Are you sure you want to delete the selected categories?')) {
      return;
    }

    try {
      const promises = selectedCategories.map(id => 
        fetch(\`/api/categories/\${id}\`, {
          method: action === 'delete' ? 'DELETE' : 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: action === 'activate' ? 'ACTIVE' : 'INACTIVE'
          }),
        })
      );

      await Promise.all(promises);

      toast.success(\`Categories \${action}d successfully\`);
      setSelectedCategories([]);
      fetchCategories();
    } catch (error) {
      console.error(\`Error performing bulk \${action}:\`, error);
      toast.error(\`Failed to \${action} categories\`);
    }
  };

  const toggleSelectAll = () => {
    setSelectedCategories(prev => 
      prev.length === categories.length ? [] : categories.map(c => c.id)
    );
  };

  const sortedCategories = [...categories].sort((a, b) => {
    const factor = sort.direction === 'asc' ? 1 : -1;
    switch (sort.field) {
      case 'name':
        return a.name.localeCompare(b.name) * factor;
      case 'displayOrder':
        return (a.displayOrder - b.displayOrder) * factor;
      case 'products':
        return (a._count.products - b._count.products) * factor;
      default:
        return 0;
    }
  });

  return (
    <div className="bg-white shadow-sm rounded-lg">
      {/* Bulk Actions */}
      {selectedCategories.length > 0 && (
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-700">
              {selectedCategories.length} selected
            </span>
            <Button
              variant="outline"
              onClick={() => handleBulkAction('activate')}
            >
              Activate
            </Button>
            <Button
              variant="outline"
              onClick={() => handleBulkAction('deactivate')}
            >
              Deactivate
            </Button>
            <Button
              variant="outline"
              className="text-red-600 hover:text-red-700"
              onClick={() => handleBulkAction('delete')}
            >
              Delete
            </Button>
          </div>
        </div>
      )}

      {/* Category Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                  checked={selectedCategories.length === categories.length}
                  onChange={toggleSelectAll}
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  className="inline-flex items-center"
                  onClick={() => {
                    const direction = sort.direction === 'asc' ? 'desc' : 'asc';
                    setSort({ field: 'name', direction });
                  }}
                >
                  Name
                  <ArrowUpDown className="ml-1 h-4 w-4" />
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  className="inline-flex items-center"
                  onClick={() => {
                    const direction = sort.direction === 'asc' ? 'desc' : 'asc';
                    setSort({ field: 'displayOrder', direction });
                  }}
                >
                  Display Order
                  <ArrowUpDown className="ml-1 h-4 w-4" />
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  className="inline-flex items-center"
                  onClick={() => {
                    const direction = sort.direction === 'asc' ? 'desc' : 'asc';
                    setSort({ field: 'products', direction });
                  }}
                >
                  Products
                  <ArrowUpDown className="ml-1 h-4 w-4" />
                </button>
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : sortedCategories.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                  No categories found
                </td>
              </tr>
            ) : (
              sortedCategories.map((category) => (
                <tr key={category.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                      checked={selectedCategories.includes(category.id)}
                      onChange={(e) => {
                        setSelectedCategories(prev => 
                          e.target.checked
                            ? [...prev, category.id]
                            : prev.filter(id => id !== category.id)
                        );
                      }}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {category.image && (
                        <div className="flex-shrink-0 h-10 w-10 mr-4">
                          <Image
                            src={category.image}
                            alt=""
                            width={40}
                            height={40}
                            className="rounded-lg object-cover"
                          />
                        </div>
                      )}
                      <div className="text-sm font-medium text-gray-900">
                        {category.name}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {category.displayOrder}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      category.status === 'ACTIVE'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {category.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {category._count.products}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/admin/categories/${category.id}/edit`}
                        className="text-primary hover:text-primary-dark"
                      >
                        <Edit className="h-5 w-5" />
                      </Link>
                      <button
                        onClick={() => handleDelete(category.id)}
                        className="text-red-400 hover:text-red-500"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}