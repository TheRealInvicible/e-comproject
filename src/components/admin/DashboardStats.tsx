'use client';

import { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  Users, 
  CreditCard, 
  Package 
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface DashboardStats {
  orders: { total: number; change: number };
  customers: { total: number; change: number };
  revenue: { total: number; change: number };
  products: { total: number; change: number };
}

export function DashboardStats() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/dashboard/stats');
        const data = await response.json();
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg p-6 animate-pulse">
            <div className="h-8 w-24 bg-gray-200 rounded mb-4"></div>
            <div className="h-6 w-16 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const statItems = [
    {
      name: 'Total Orders',
      value: stats.orders.total,
      change: stats.orders.change,
      icon: ShoppingBag,
    },
    {
      name: 'Total Customers',
      value: stats.customers.total,
      change: stats.customers.change,
      icon: Users,
    },
    {
      name: 'Total Revenue',
      value: formatCurrency(stats.revenue.total),
      change: stats.revenue.change,
      icon: CreditCard,
    },
    {
      name: 'Active Products',
      value: stats.products.total,
      change: stats.products.change,
      icon: Package,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {statItems.map((stat) => (
        <div
          key={stat.name}
          className="relative overflow-hidden rounded-lg bg-white px-4 pb-12 pt-5 shadow sm:px-6 sm:pt-6"
        >
          <dt>
            <div className="absolute rounded-md bg-primary/10 p-3">
              <stat.icon className="h-6 w-6 text-primary" aria-hidden="true" />
            </div>
            <p className="ml-16 truncate text-sm font-medium text-gray-500">
              {stat.name}
            </p>
          </dt>
          <dd className="ml-16 flex items-baseline pb-6 sm:pb-7">
            <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
            <p
              className={`ml-2 flex items-baseline text-sm font-semibold ${
                stat.change >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {stat.change >= 0 ? '+' : ''}{stat.change.toFixed(2)}%
            </p>
          </dd>
        </div>
      ))}
    </div>
  );
}