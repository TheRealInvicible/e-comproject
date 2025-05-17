import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { DashboardSidebar } from '@/components/shop/dashboard/DashboardSidebar';
import { authOptions } from '@/lib/auth';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login?callbackUrl=/dashboard');
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        <div className="w-full md:w-1/4">
          <DashboardSidebar />
        </div>
        <div className="w-full md:w-3/4">
          {children}
        </div>
      </div>
    </div>
  );
}