'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  UserIcon,
  ShoppingBagIcon,
  HeartIcon,
  MapPinIcon,
  BellIcon,
} from '@heroicons/react/24/outline';

const navigation = [
  { name: 'Profile', href: '/dashboard', icon: UserIcon },
  { name: 'Orders', href: '/dashboard/orders', icon: ShoppingBagIcon },
  { name: 'Wishlist', href: '/dashboard/wishlist', icon: HeartIcon },
  { name: 'Addresses', href: '/dashboard/addresses', icon: MapPinIcon },
  { name: 'Notifications', href: '/dashboard/notifications', icon: BellIcon },
];

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <nav className="space-y-1">
      {navigation.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.name}
            href={item.href}
            className={`${
              isActive
                ? 'bg-primary text-white'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            } group flex items-center px-3 py-2 text-sm font-medium rounded-md`}
          >
            <item.icon
              className={`${
                isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-500'
              } flex-shrink-0 -ml-1 mr-3 h-6 w-6`}
            />
            <span className="truncate">{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}