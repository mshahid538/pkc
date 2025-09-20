'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  MessageSquare, 
  FileText, 
  Settings, 
  Menu, 
  X,
  Search,
  BookOpen
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Chat', href: '/dashboard/chat', icon: MessageSquare },
  { name: 'Files', href: '/dashboard/files', icon: FileText },
  { name: 'Search', href: '/dashboard/search', icon: Search },
  { name: 'Knowledge Base', href: '/dashboard/knowledge', icon: BookOpen },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export default function Sidebar() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      {/* Mobile sidebar */}
      <div className={`lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 z-50">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
          <div className="relative flex w-64 flex-col bg-white">
            <div className="flex h-16 items-center justify-between px-4">
              <h1 className="text-xl font-bold text-gray-900">PKC</h1>
              <button
                onClick={() => setSidebarOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <nav className="flex-1 space-y-1 px-2 py-4">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                      isActive
                        ? 'bg-blue-100 text-blue-900'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <item.icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white/80 backdrop-blur-sm border-r border-white/20 shadow-xl">
          <div className="flex h-16 items-center px-4 bg-gradient-to-r from-blue-600 to-purple-600">
            <h1 className="text-xl font-bold text-white">PKC Dashboard</h1>
          </div>
          <nav className="flex-1 space-y-1 px-2 py-4">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center px-3 py-3 text-sm font-medium rounded-xl transition-all duration-300 ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                      : 'text-gray-600 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:text-gray-900 hover:shadow-md'
                  }`}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Mobile menu button */}
      <div className="lg:hidden">
        <button
          onClick={() => setSidebarOpen(true)}
          className="fixed top-4 left-4 z-40 p-2 bg-white rounded-md shadow-md"
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>
    </>
  );
}
