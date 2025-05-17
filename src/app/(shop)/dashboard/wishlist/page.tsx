import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { WishlistGrid } from '@/components/shop/dashboard/WishlistGrid';

export const metadata = {
  title: 'My Wishlist | Dominion Store',
  description: 'View and manage your wishlist'
};

async function getWishlist(userId: string) {
  return prisma.wishlistItem.findMany({
    where: { userId },
    include: {
      product: {
        include: {
          category: true
        }
      }
    }
  });
}

export default async function WishlistPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return null;
  }

  const wishlistItems = await getWishlist(session.user.id);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">My Wishlist</h1>
      
      <WishlistGrid items={wishlistItems} />
    </div>
  );
}