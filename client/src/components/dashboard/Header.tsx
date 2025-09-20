'use client';

import { UserButton } from '@clerk/nextjs';
import { Bell, Search } from 'lucide-react';

export default function Header() {
  return (
    <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-white/20 bg-white/80 backdrop-blur-sm px-4 shadow-lg sm:gap-x-6 sm:px-6 lg:px-8">
      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        <div className="relative flex flex-1 items-center">
          <Search className="pointer-events-none absolute inset-y-0 left-0 h-full w-5 text-gray-400" />
          <input
            type="search"
            placeholder="Search files, threads, or knowledge..."
            className="block h-full w-full border-0 py-0 pl-8 pr-0 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm bg-transparent"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-x-4 lg:gap-x-6">
        <button
          type="button"
          className="-m-2.5 p-2.5 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
        >
          <span className="sr-only">View notifications</span>
          <Bell className="h-6 w-6" />
        </button>

        <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-gray-300" />

        <div className="flex items-center gap-x-4 lg:gap-x-6">
          <UserButton 
            afterSignOutUrl="/"
            appearance={{
              elements: {
                avatarBox: "h-8 w-8"
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
