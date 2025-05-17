import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { OrderList } from '@/components/shop/dashboard/OrderList';
import { OrderFilters } from '@/components/shop/dashboard/OrderFilters';

export const metadata = {
  title: 'My Orders | Dominion Store',
  description: 'View and track your orders'
};

async function getOrders(userId: string, status?: string) {
  return prisma.order.findMany({
    where: {
      userId,
      ...(status && { status })
    },
    include: {
      items: {
        include: {
          product: {
            select: {
              name: true,
              images: true
            }
          }
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });
}

export default async function OrdersPage({
  searchParams
}: {
  searchParams: { status?: string }
}) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return null;
  }

  const orders = await getOrders(session.user.id, searchParams.status);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">My Orders</h1>
      
      <OrderFilters />
      
      <OrderList orders={orders} />
    </div>
  );
}