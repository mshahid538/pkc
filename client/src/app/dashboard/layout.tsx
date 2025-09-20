import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/dashboard/Sidebar';
import Header from '@/components/dashboard/Header';
import DashboardWrapper from '@/components/dashboard/DashboardWrapper';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();

  if (!user) {
    redirect('/');
  }

  return (
    <DashboardWrapper>
      <Sidebar />
      <div className="lg:pl-64">
        <Header />
        <main className="py-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </DashboardWrapper>
  );
}
