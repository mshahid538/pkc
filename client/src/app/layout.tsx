import { ClerkProvider } from '@clerk/nextjs';
import { Inter } from 'next/font/google';
import './globals.css';
import '@/utils/globalErrorHandler';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'PKC Dashboard',
  description: 'Personal Knowledge Console Dashboard',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Try to get the publishable key from environment variables
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  
  // If no publishable key from env, show instructions to create .env.local
  if (!publishableKey) {
    return (
      <html lang="en">
        <body className={inter.className}>
          <div className="min-h-screen bg-blue-50 flex items-center justify-center">
            <div className="bg-white p-8 rounded-lg shadow-lg max-w-2xl">
              <h1 className="text-3xl font-bold text-blue-600 mb-6">🔧 Setup Required</h1>
              
              <div className="space-y-4">
                <p className="text-gray-700">
                  To use Clerk authentication, you need to create a <code>.env.local</code> file in the client directory.
                </p>
                
                <div className="bg-gray-100 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Create <code>client/.env.local</code> with:</h3>
                  <pre className="text-sm bg-black text-green-400 p-3 rounded overflow-x-auto">
{`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
CLERK_SECRET_KEY=sk_test_your_key_here
NEXT_PUBLIC_API_URL=https://pkc-server.vercel.app`}
                  </pre>
                </div>
                
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-yellow-800 mb-2">Steps:</h3>
                  <ol className="list-decimal list-inside text-yellow-700 space-y-1">
                    <li>Get your Clerk keys from <a href="https://dashboard.clerk.com/last-active?path=api-keys" target="_blank" className="underline">Clerk Dashboard</a></li>
                    <li>Create <code>client/.env.local</code> file</li>
                    <li>Add the environment variables above</li>
                    <li>Restart the frontend server</li>
                  </ol>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-green-800 mb-2">Alternative: Test Without Auth</h3>
                  <p className="text-green-700">
                    You can test the backend API directly at <a href="https://pkc-server.vercel.app/api-docs" target="_blank" className="underline">https://pkc-server.vercel.app/api-docs</a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </body>
      </html>
    );
  }

  return (
    <ClerkProvider publishableKey={publishableKey}>
      <html lang="en">
        <body className={inter.className}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
