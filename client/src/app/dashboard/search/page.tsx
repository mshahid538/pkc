'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { 
  Search, 
  FileText, 
  MessageSquare, 
  Filter,
  Calendar,
  User,
  Bot,
  Clock,
  Tag,
  BookOpen
} from 'lucide-react';

interface SearchResult {
  id: string;
  type: 'file' | 'message' | 'thread';
  title: string;
  content: string;
  created_at: string;
  metadata?: {
    filename?: string;
    thread_title?: string;
    author?: string;
  };
}

export default function SearchPage() {
  const { getToken } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [filters, setFilters] = useState({
    type: 'all',
    dateRange: 'all',
  });

  const performSearch = async (query: string) => {
    if (!query.trim()) return;

    setLoading(true);
    setHasSearched(true);
    
    try {
      const token = await getToken({ template: 'supabase' });
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // For now, we'll create mock search results since we don't have a search endpoint yet
      // In a real implementation, this would call a search API
      const mockResults: SearchResult[] = [
        {
          id: '1',
          type: 'file',
          title: 'Project Documentation.pdf',
          content: `This document contains information about ${query} and project specifications...`,
          created_at: new Date().toISOString(),
          metadata: {
            filename: 'Project Documentation.pdf',
            author: 'John Doe'
          }
        },
        {
          id: '2',
          type: 'message',
          title: 'Discussion about project requirements',
          content: `We discussed ${query} in our meeting yesterday. The main points were...`,
          created_at: new Date(Date.now() - 86400000).toISOString(),
          metadata: {
            thread_title: 'Project Planning',
            author: 'Jane Smith'
          }
        },
        {
          id: '3',
          type: 'thread',
          title: 'Technical Architecture Discussion',
          content: `This thread covers ${query} and related technical decisions...`,
          created_at: new Date(Date.now() - 172800000).toISOString(),
          metadata: {
            thread_title: 'Technical Architecture Discussion'
          }
        }
      ];

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setResults(mockResults);
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(searchQuery);
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'file':
        return FileText;
      case 'message':
        return MessageSquare;
      case 'thread':
        return BookOpen;
      default:
        return Search;
    }
  };

  const getResultColor = (type: string) => {
    switch (type) {
      case 'file':
        return 'text-blue-600 bg-blue-100';
      case 'message':
        return 'text-green-600 bg-green-100';
      case 'thread':
        return 'text-purple-600 bg-purple-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const filteredResults = results.filter(result => {
    if (filters.type !== 'all' && result.type !== filters.type) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-600 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Knowledge Search</h1>
            <p className="text-purple-100">Search across all your files, conversations, and content</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{results.length}</div>
            <div className="text-purple-100 text-sm">Results Found</div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-6 w-6" />
            <input
              type="text"
              placeholder="Search your knowledge base..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 text-lg border border-gray-300 rounded-xl focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
            />
            <button
              type="submit"
              disabled={loading || !searchQuery.trim()}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 px-6 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                'Search'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Filters */}
      {hasSearched && (
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-center space-x-4">
            <Filter className="h-5 w-5 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filters:</span>
            
            <select
              value={filters.type}
              onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="file">Files</option>
              <option value="message">Messages</option>
              <option value="thread">Threads</option>
            </select>

            <select
              value={filters.dateRange}
              onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>
        </div>
      )}

      {/* Search Results */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-4"></div>
            <p className="text-gray-500">Searching your knowledge base...</p>
          </div>
        ) : hasSearched && filteredResults.length === 0 ? (
          <div className="p-12 text-center">
            <Search className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No results found
            </h3>
            <p className="text-gray-500">
              Try adjusting your search terms or filters
            </p>
          </div>
        ) : hasSearched ? (
          <div className="divide-y divide-gray-200">
            {filteredResults.map((result) => {
              const Icon = getResultIcon(result.type);
              const colorClass = getResultColor(result.type);
              
              return (
                <div key={result.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start space-x-4">
                    <div className={`p-3 rounded-xl ${colorClass}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                          {result.title}
                        </h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${colorClass}`}>
                          {result.type}
                        </span>
                      </div>
                      
                      <p className="text-gray-600 mb-3 line-clamp-2">
                        {result.content}
                      </p>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          {new Date(result.created_at).toLocaleDateString()}
                        </span>
                        
                        {result.metadata?.author && (
                          <span className="flex items-center">
                            <User className="h-4 w-4 mr-1" />
                            {result.metadata.author}
                          </span>
                        )}
                        
                        {result.metadata?.filename && (
                          <span className="flex items-center">
                            <FileText className="h-4 w-4 mr-1" />
                            {result.metadata.filename}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <button className="p-2 text-gray-400 hover:text-purple-500 transition-colors">
                      <Search className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center">
            <Search className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Start searching
            </h3>
            <p className="text-gray-500">
              Enter a search term to find content across your knowledge base
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
