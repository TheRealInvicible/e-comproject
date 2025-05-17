import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { ProfileForm } from '@/components/shop/dashboard/ProfileForm';
import { DashboardStats } from '@/components/shop/dashboard/DashboardStats';

export const metadata = {
  title: 'My Dashboard | Dominion Store',
  description: 'Manage your account and view your orders'
};

async function getUserProfile(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      orders: {
        take: 5,
        orderBy: { createdAt: 'desc' },
      },
      addresses: true,
      wishlist: {
        include: {
          product: true
        }
      }
    }
  });
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect('/login');
  }

  const userProfile = await getUserProfile(session.user.id);

  if (!userProfile) {
    return null;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">My Dashboard</h1>
      
      {/* Dashboard Stats */}
      <DashboardStats
        totalOrders={userProfile.orders.length}
        wishlistItems={userProfile.wishlist.length}
        savedAddresses={userProfile.addresses.length}
      />

      {/* Profile Information */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium mb-4">Profile Information</h2>
        <ProfileForm user={userProfile} />
      </div>
    </div>
  );
}