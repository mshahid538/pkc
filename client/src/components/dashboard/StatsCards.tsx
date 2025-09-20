'use client';

import { useEffect, useState } from 'react';
import { FileText, MessageSquare, Users, Database, TrendingUp, Activity } from 'lucide-react';
import { getApiUrl } from '@/config/api';
import { useAuth } from '@clerk/nextjs';

interface Stats {
  totalFiles: number;
  totalThreads: number;
  totalMessages: number;
  storageUsed: number;
}

export default function StatsCards() {
  const { getToken } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalFiles: 0,
    totalThreads: 0,
    totalMessages: 0,
    storageUsed: 0,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = await getToken();
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        // Fetch actual data from the backend API
        const [filesResponse, threadsResponse] = await Promise.all([
          fetch(getApiUrl('UPLOAD', ''), { headers }).then(res => res.json()).catch(() => ({ data: { files: [] } })),
          fetch(getApiUrl('CHAT', ''), { headers }).then(res => res.json()).catch(() => ({ data: { conversations: [] } }))
        ]);

        const totalFiles = filesResponse.data?.files?.length || 0;
        const totalThreads = threadsResponse.data?.conversations?.length || 0;

        // Calculate total messages from threads
        const totalMessages = threadsResponse.data?.conversations?.reduce((sum: number, thread: any) =>
          sum + (thread.message_count || 0), 0) || 0;

        // Calculate storage used (mock calculation)
        const storageUsed = totalFiles * 0.2; // Assume 0.2GB per file on average

        setStats({
          totalFiles,
          totalThreads,
          totalMessages,
          storageUsed: Math.round(storageUsed * 10) / 10, // Round to 1 decimal
        });
      } catch (error) {
        console.error('Failed to fetch stats:', error);
        // Fallback to mock data if API fails
        setStats({
          totalFiles: 0,
          totalThreads: 0,
          totalMessages: 0,
          storageUsed: 0,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [getToken]);

  const cards = [
    {
      name: 'Total Files',
      value: stats.totalFiles,
      icon: FileText,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'from-blue-50 to-blue-100',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-600',
      change: '+12%',
      changeType: 'positive' as const,
    },
    {
      name: 'Chat Threads',
      value: stats.totalThreads,
      icon: MessageSquare,
      color: 'from-green-500 to-green-600',
      bgColor: 'from-green-50 to-green-100',
      borderColor: 'border-green-200',
      textColor: 'text-green-600',
      change: '+8%',
      changeType: 'positive' as const,
    },
    {
      name: 'Messages',
      value: stats.totalMessages,
      icon: Users,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'from-purple-50 to-purple-100',
      borderColor: 'border-purple-200',
      textColor: 'text-purple-600',
      change: '+24%',
      changeType: 'positive' as const,
    },
    {
      name: 'Storage Used',
      value: `${stats.storageUsed} GB`,
      icon: Database,
      color: 'from-orange-500 to-orange-600',
      bgColor: 'from-orange-50 to-orange-100',
      borderColor: 'border-orange-200',
      textColor: 'text-orange-600',
      change: '+5%',
      changeType: 'positive' as const,
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 animate-pulse">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 bg-gray-200 rounded-xl"></div>
              <div className="h-6 w-16 bg-gray-200 rounded-full"></div>
            </div>
            <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card) => (
        <div 
          key={card.name} 
          className={`bg-gradient-to-br ${card.bgColor} rounded-2xl p-6 shadow-lg border ${card.borderColor} hover:shadow-xl transition-all duration-300 hover:scale-105 group`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className={`p-3 rounded-xl bg-gradient-to-r ${card.color} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
              <card.icon className="h-6 w-6 text-white" />
            </div>
            <div className={`flex items-center px-2 py-1 rounded-full text-xs font-medium ${
              card.changeType === 'positive' 
                ? 'bg-green-100 text-green-700' 
                : 'bg-red-100 text-red-700'
            }`}>
              <TrendingUp className="h-3 w-3 mr-1" />
              {card.change}
            </div>
          </div>
          
          <div className="space-y-2">
            <h3 className={`text-2xl font-bold ${card.textColor}`}>
              {card.value}
            </h3>
            <p className="text-gray-600 font-medium">
              {card.name}
            </p>
          </div>

          <div className="mt-4 flex items-center text-sm text-gray-500">
            <Activity className="h-4 w-4 mr-1" />
            <span>Updated just now</span>
          </div>
        </div>
      ))}
    </div>
  );
}