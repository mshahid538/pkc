'use client';

import { useState } from 'react';
import NetworkStatus from '@/components/NetworkStatus';

interface DashboardWrapperProps {
  children: React.ReactNode;
}

export default function DashboardWrapper({ children }: DashboardWrapperProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [showNetworkBanner, setShowNetworkBanner] = useState(false);

  const handleNetworkStatusChange = (online: boolean) => {
    const wasOnline = isOnline;
    setIsOnline(online);
    if (!online && wasOnline) {
      setShowNetworkBanner(true);
    } else if (online) {
      setShowNetworkBanner(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Network Status Banner - only show when status changes to offline */}
      {showNetworkBanner && !isOnline && (
        <div className="bg-red-500 text-white px-4 py-2 text-center text-sm">
          <div className="flex items-center justify-center space-x-2">
            <span>⚠️ Network connection issue detected</span>
            <button 
              onClick={() => setShowNetworkBanner(false)}
              className="text-xs px-2 py-1 bg-red-600 hover:bg-red-700 rounded"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
      
      <NetworkStatus onStatusChange={handleNetworkStatusChange} />
      {children}
    </div>
  );
}
