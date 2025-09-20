import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();

  if (!user) {
    redirect('/');
  }

  // Check if user has admin privileges
  // For now, we'll allow all authenticated users to access admin
  // In production, you might want to check user roles or permissions
  
  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  );
}
