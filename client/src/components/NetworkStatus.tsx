'use client';

import { useState, useEffect } from 'react';
import { Wifi, WifiOff, AlertTriangle, CheckCircle } from 'lucide-react';
import { checkNetworkConnectivity } from '@/utils/network';

interface NetworkStatusProps {
  onStatusChange?: (isOnline: boolean) => void;
}

export default function NetworkStatus({ onStatusChange }: NetworkStatusProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkConnection = async () => {
    setIsChecking(true);
    try {
      const connected = await checkNetworkConnectivity();
      setIsOnline(connected);
      setLastChecked(new Date());
      onStatusChange?.(connected);
    } catch (error) {
      console.error('Network check failed:', error);
      setIsOnline(false);
      onStatusChange?.(false);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    // Start with browser's online status
    setIsOnline(navigator.onLine);
    onStatusChange?.(navigator.onLine);


    // Listen for online/offline events
    const handleOnline = () => {
      setIsOnline(true);
      onStatusChange?.(true);
    };

    const handleOffline = () => {
      setIsOnline(false);
      onStatusChange?.(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [onStatusChange]);

  if (isOnline) {
    return (
      <div className="flex items-center space-x-2 text-green-600">
        <CheckCircle className="h-4 w-4" />
        <span className="text-sm">Connected</span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2 text-red-600">
      <WifiOff className="h-4 w-4" />
      <span className="text-sm">Connection Issue</span>
      <button
        onClick={checkConnection}
        disabled={isChecking}
        className="text-xs px-2 py-1 bg-red-100 hover:bg-red-200 rounded transition-colors disabled:opacity-50"
      >
        {isChecking ? 'Checking...' : 'Retry'}
      </button>
    </div>
  );
}
