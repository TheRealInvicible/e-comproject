import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { AddressList } from '@/components/shop/dashboard/AddressList';
import { AddressForm } from '@/components/shop/dashboard/AddressForm';

export const metadata = {
  title: 'My Addresses | Dominion Store',
  description: 'Manage your delivery addresses'
};

async function getAddresses(userId: string) {
  return prisma.address.findMany({
    where: { userId },
    orderBy: { isDefault: 'desc' }
  });
}

export default async function AddressesPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return null;
  }

  const addresses = await getAddresses(session.user.id);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">My Addresses</h1>
        <AddressForm />
      </div>
      
      <AddressList addresses={addresses} />
    </div>
  );
}