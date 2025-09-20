import { Suspense } from 'react';
import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import StatsCards from '@/components/dashboard/StatsCards';

export default async function DashboardPage() {
  const user = await currentUser();
  
  if (!user) {
    redirect('/');
  }

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-8 text-white shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Welcome back!</h1>
            <p className="text-xl text-blue-100">
              {user.firstName || user.emailAddresses[0]?.emailAddress}
            </p>
            <p className="text-blue-200 mt-2">Ready to explore your knowledge base?</p>
          </div>
          <div className="hidden md:block">
            <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center">
              <span className="text-3xl">🚀</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <Suspense fallback={
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 shadow-lg animate-pulse">
              <div className="h-12 w-12 bg-gray-200 rounded-xl mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      }>
        <StatsCards />
      </Suspense>

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Quick Actions */}
        <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <span className="text-3xl mr-3">🚀</span>
            Quick Actions
          </h3>
          <div className="space-y-4">
            <Link
              href="/dashboard/chat"
              className="block w-full p-4 bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 rounded-2xl transition-all duration-300 border border-blue-200 hover:shadow-lg group"
            >
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
                  <span className="text-white text-xl">💬</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Start New Chat</h4>
                  <p className="text-sm text-gray-600">Begin a conversation with AI</p>
                </div>
              </div>
            </Link>

            <Link
              href="/dashboard/files"
              className="block w-full p-4 bg-gradient-to-r from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 rounded-2xl transition-all duration-300 border border-green-200 hover:shadow-lg group"
            >
              <div className="flex items-center">
                <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
                  <span className="text-white text-xl">📁</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Upload Files</h4>
                  <p className="text-sm text-gray-600">Add documents to your knowledge base</p>
                </div>
              </div>
            </Link>

            <Link
              href="/dashboard/search"
              className="block w-full p-4 bg-gradient-to-r from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 rounded-2xl transition-all duration-300 border border-purple-200 hover:shadow-lg group"
            >
              <div className="flex items-center">
                <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
                  <span className="text-white text-xl">🔍</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Search Knowledge Base</h4>
                  <p className="text-sm text-gray-600">Find information across all your content</p>
                </div>
              </div>
            </Link>

            <Link
              href="/api-test"
              className="block w-full p-4 bg-gradient-to-r from-yellow-50 to-yellow-100 hover:from-yellow-100 hover:to-yellow-200 rounded-2xl transition-all duration-300 border border-yellow-200 hover:shadow-lg group"
            >
              <div className="flex items-center">
                <div className="w-12 h-12 bg-yellow-500 rounded-xl flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
                  <span className="text-white text-xl">🧪</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Test API Routes</h4>
                  <p className="text-sm text-gray-600">Debug and test your API endpoints</p>
                </div>
              </div>
            </Link>

            <Link
              href="/admin"
              className="block w-full p-4 bg-gradient-to-r from-indigo-50 to-indigo-100 hover:from-indigo-100 hover:to-indigo-200 rounded-2xl transition-all duration-300 border border-indigo-200 hover:shadow-lg group"
            >
              <div className="flex items-center">
                <div className="w-12 h-12 bg-indigo-500 rounded-xl flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
                  <span className="text-white text-xl">🛠️</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Admin Dashboard</h4>
                  <p className="text-sm text-gray-600">Manage system and view analytics</p>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <span className="text-3xl mr-3">📊</span>
            Recent Activity
          </h3>
          <div className="space-y-4">
            <div className="flex items-center p-4 bg-gray-50 rounded-2xl">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                <span className="text-blue-600 text-lg">💬</span>
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">No recent conversations</p>
                <p className="text-sm text-gray-500">Start chatting to see activity here</p>
              </div>
            </div>

            <div className="flex items-center p-4 bg-gray-50 rounded-2xl">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-4">
                <span className="text-green-600 text-lg">📁</span>
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">No files uploaded</p>
                <p className="text-sm text-gray-500">Upload your first document</p>
              </div>
            </div>

            <div className="flex items-center p-4 bg-gray-50 rounded-2xl">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mr-4">
                <span className="text-purple-600 text-lg">🔍</span>
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">No searches performed</p>
                <p className="text-sm text-gray-500">Search your knowledge base</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Getting Started Guide */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-3xl p-8 border border-indigo-200">
        <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <span className="text-3xl mr-3">🎯</span>
          Getting Started
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center mb-4">
              <span className="text-white text-xl">1️⃣</span>
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">Upload Files</h4>
            <p className="text-sm text-gray-600">Add documents to build your knowledge base with PDFs, text files, and more.</p>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center mb-4">
              <span className="text-white text-xl">2️⃣</span>
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">Start Chatting</h4>
            <p className="text-sm text-gray-600">Ask questions about your content and get AI-powered responses with context.</p>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center mb-4">
              <span className="text-white text-xl">3️⃣</span>
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">Organize & Search</h4>
            <p className="text-sm text-gray-600">Create threads, organize conversations, and search through your knowledge base.</p>
          </div>
        </div>
      </div>
    </div>
  );
}