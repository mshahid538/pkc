'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { 
  BookOpen, 
  FileText, 
  MessageSquare, 
  Tag,
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  Calendar,
  User,
  TrendingUp,
  BarChart3
} from 'lucide-react';

interface KnowledgeItem {
  id: string;
  type: 'file' | 'thread' | 'summary';
  title: string;
  content: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  author: string;
  views: number;
}

export default function KnowledgePage() {
  const { getToken } = useAuth();
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    fetchKnowledgeItems();
  }, []);

  const fetchKnowledgeItems = async () => {
    try {
      setLoading(true);
      // Mock data for now - in a real app, this would fetch from an API
      const mockItems: KnowledgeItem[] = [
        {
          id: '1',
          type: 'file',
          title: 'Project Requirements Document',
          content: 'Comprehensive project requirements and specifications...',
          tags: ['requirements', 'project', 'documentation'],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          author: 'John Doe',
          views: 45
        },
        {
          id: '2',
          type: 'thread',
          title: 'Technical Architecture Discussion',
          content: 'Discussion about system architecture and design patterns...',
          tags: ['architecture', 'technical', 'design'],
          created_at: new Date(Date.now() - 86400000).toISOString(),
          updated_at: new Date(Date.now() - 3600000).toISOString(),
          author: 'Jane Smith',
          views: 32
        },
        {
          id: '3',
          type: 'summary',
          title: 'Meeting Notes - Sprint Planning',
          content: 'Summary of sprint planning meeting and action items...',
          tags: ['meeting', 'sprint', 'planning'],
          created_at: new Date(Date.now() - 172800000).toISOString(),
          updated_at: new Date(Date.now() - 172800000).toISOString(),
          author: 'Mike Johnson',
          views: 28
        }
      ];

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      setItems(mockItems);
    } catch (error) {
      console.error('Failed to fetch knowledge items:', error);
    } finally {
      setLoading(false);
    }
  };

  const allTags = Array.from(new Set(items.flatMap(item => item.tags)));

  const filteredItems = items.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = selectedTag === 'all' || item.tags.includes(selectedTag);
    return matchesSearch && matchesTag;
  });

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'file':
        return FileText;
      case 'thread':
        return MessageSquare;
      case 'summary':
        return BookOpen;
      default:
        return BookOpen;
    }
  };

  const getItemColor = (type: string) => {
    switch (type) {
      case 'file':
        return 'from-blue-500 to-blue-600';
      case 'thread':
        return 'from-green-500 to-green-600';
      case 'summary':
        return 'from-purple-500 to-purple-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Knowledge Base</h1>
            <p className="text-indigo-100">Organize and explore your accumulated knowledge</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{items.length}</div>
            <div className="text-indigo-100 text-sm">Knowledge Items</div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-xl">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Documents</p>
              <p className="text-2xl font-bold text-gray-900">
                {items.filter(item => item.type === 'file').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-xl">
              <MessageSquare className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Discussions</p>
              <p className="text-2xl font-bold text-gray-900">
                {items.filter(item => item.type === 'thread').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-xl">
              <BookOpen className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Summaries</p>
              <p className="text-2xl font-bold text-gray-900">
                {items.filter(item => item.type === 'summary').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-center">
            <div className="p-3 bg-orange-100 rounded-xl">
              <TrendingUp className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Views</p>
              <p className="text-2xl font-bold text-gray-900">
                {items.reduce((sum, item) => sum + item.views, 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
        <div className="flex flex-col lg:flex-row lg:items-center space-y-4 lg:space-y-0 lg:space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search knowledge base..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          
          <div className="flex items-center space-x-4">
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="all">All Tags</option>
              {allTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'grid' ? 'bg-indigo-100 text-indigo-600' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <BarChart3 className="h-5 w-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'list' ? 'bg-indigo-100 text-indigo-600' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <Filter className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Knowledge Items */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Knowledge Items ({filteredItems.length})
            </h2>
            <button className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors flex items-center">
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading knowledge base...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center">
            <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {searchQuery || selectedTag !== 'all' ? 'No items found' : 'No knowledge items yet'}
            </h3>
            <p className="text-gray-500">
              {searchQuery || selectedTag !== 'all' 
                ? 'Try adjusting your search or filters'
                : 'Start building your knowledge base by adding items'
              }
            </p>
          </div>
        ) : (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6' : 'divide-y divide-gray-200'}>
            {filteredItems.map((item) => {
              const Icon = getItemIcon(item.type);
              const colorClass = getItemColor(item.type);
              
              return (
                <div
                  key={item.id}
                  className={viewMode === 'grid' 
                    ? 'bg-gradient-to-br from-gray-50 to-white rounded-xl p-6 border border-gray-100 hover:shadow-lg transition-all duration-200'
                    : 'p-6 hover:bg-gray-50 transition-colors'
                  }
                >
                  <div className="flex items-start space-x-4">
                    <div className={`p-3 rounded-xl bg-gradient-to-r ${colorClass} text-white`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                          {item.title}
                        </h3>
                        <div className="flex items-center space-x-1">
                          <button className="p-1 text-gray-400 hover:text-indigo-500 transition-colors">
                            <Edit className="h-4 w-4" />
                          </button>
                          <button className="p-1 text-gray-400 hover:text-red-500 transition-colors">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      
                      <p className="text-gray-600 mb-3 line-clamp-2">
                        {item.content}
                      </p>
                      
                      <div className="flex flex-wrap gap-2 mb-3">
                        {item.tags.map(tag => (
                          <span
                            key={tag}
                            className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                          >
                            <Tag className="h-3 w-3 inline mr-1" />
                            {tag}
                          </span>
                        ))}
                      </div>
                      
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <div className="flex items-center space-x-4">
                          <span className="flex items-center">
                            <User className="h-4 w-4 mr-1" />
                            {item.author}
                          </span>
                          <span className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            {new Date(item.updated_at).toLocaleDateString()}
                          </span>
                        </div>
                        <span className="flex items-center">
                          <TrendingUp className="h-4 w-4 mr-1" />
                          {item.views} views
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
