import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Personal Knowledge Console
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Your intelligent workspace for managing documents, conversations, and knowledge with AI-powered insights.
          </p>
          
          <SignedOut>
            <div className="bg-white rounded-lg shadow-lg p-8 max-w-md mx-auto mb-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                Welcome to PKC
              </h2>
              <p className="text-gray-600 mb-6">
                Sign in to access your personal knowledge console with AI-powered features.
              </p>
              <div className="space-y-4">
                <SignInButton mode="modal">
                  <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors">
                    Sign In
                  </button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors">
                    Create Account
                  </button>
                </SignUpButton>
              </div>
            </div>
          </SignedOut>

          <SignedIn>
            <div className="bg-white rounded-lg shadow-lg p-8 max-w-md mx-auto mb-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                🎉 Welcome Back!
              </h2>
              <p className="text-gray-600 mb-6">
                You&apos;re successfully authenticated. Access your dashboard to start using PKC.
              </p>
              <div className="space-y-4">
                <Link 
                  href="/dashboard"
                  className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors text-center"
                >
                  Go to Dashboard
                </Link>
                <div className="flex justify-center">
                  <UserButton afterSignOutUrl="/" />
                </div>
              </div>
            </div>
          </SignedIn>
          
          <div className="mt-8 space-x-4">
            <a 
              href="https://pkc-server.vercel.app/api-docs" 
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              View API Documentation →
            </a>
            <a 
              href="https://pkc-server.vercel.app/healthz" 
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-600 hover:text-green-800 font-medium"
            >
              Backend Health Check →
            </a>
          </div>
        </div>

        <div className="mt-16 grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-3">💬 AI Chat</h3>
            <p className="text-gray-600">
              Chat with AI using your uploaded files and knowledge base for context-aware responses.
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-3">📁 File Management</h3>
            <p className="text-gray-600">
              Upload, organize, and search through your documents with intelligent categorization.
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-3">🧵 Threads</h3>
            <p className="text-gray-600">
              Keep track of your conversations and build upon previous discussions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}