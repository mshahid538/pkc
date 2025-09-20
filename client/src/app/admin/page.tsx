'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { getApiUrl } from '@/config/api';
import { 
  Search, 
  FileText, 
  MessageSquare, 
  Tag, 
  Upload, 
  AlertCircle, 
  CheckCircle,
  Users,
  Database,
  Activity,
  Settings,
  BarChart3,
  Calendar,
  Clock,
  Filter,
  Download,
  Trash2,
  Edit,
  Eye,
  Plus
} from 'lucide-react';

interface Thread {
  id: string;
  title: string;
  created_at: string;
  message_count?: number;
  user_id: string;
}

interface File {
  id: string;
  filename: string;
  mime: string;
  size_bytes: number;
  created_at: string;
  user_id: string;
}

interface Log {
  id: string;
  level: 'info' | 'error' | 'warning';
  message: string;
  timestamp: string;
  url?: string;
  method?: string;
}

export default function AdminDashboard() {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [threads, setThreads] = useState<Thread[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filteredThreads = (threads || []).filter(thread =>
    thread.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFiles = (files || []).filter(file =>
    file.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredLogs = (logs || []).filter(log =>
    log.message.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const token = await getToken();
        
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const [threadsRes, filesRes, logsRes] = await Promise.all([
          fetch(getApiUrl('CHAT', ''), { headers }).then(res => res.json()).catch(() => ({ success: false, data: { conversations: [] } })),
          fetch(getApiUrl('UPLOAD', ''), { headers }).then(res => res.json()).catch(() => ({ success: false, data: { files: [] } })),
          fetch(getApiUrl('ADMIN', '/logs'), { headers }).then(res => res.json()).catch(() => ({ success: false, data: [] }))
        ]);


        setThreads(Array.isArray(threadsRes.data?.conversations) ? threadsRes.data.conversations : []);
        setFiles(Array.isArray(filesRes.data?.files) ? filesRes.data.files : []);
        setLogs(Array.isArray(logsRes.data) ? logsRes.data : []);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch data');
        console.error('Admin dashboard error:', err);
        setThreads([]);
        setFiles([]);
        setLogs([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [getToken]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-6"></div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Loading Admin Dashboard</h2>
          <p className="text-gray-600">Fetching your data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Error Loading Dashboard</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm shadow-lg border-b border-white/20">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Admin Dashboard
              </h1>
              <p className="text-gray-600 mt-2 text-lg">Manage threads, files, and system logs</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-medium">
                <CheckCircle className="inline w-4 h-4 mr-2" />
                System Online
              </div>
              <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium">
                <Users className="inline w-4 h-4 mr-2" />
                {threads.length} Threads
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white/60 backdrop-blur-sm border-b border-white/20 px-8 py-4">
        <div className="relative max-w-2xl">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-6 w-6" />
          <input
            type="text"
            placeholder="Search threads, files, or messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 border-0 bg-white/80 rounded-2xl shadow-lg focus:ring-4 focus:ring-blue-500/20 focus:bg-white transition-all duration-300 text-lg"
          />
          <Filter className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
        </div>
      </div>

      {/* Main Content */}
      <div className="p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Panel - Threads */}
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white flex items-center">
                  <MessageSquare className="h-7 w-7 mr-3" />
                  Threads
                </h2>
                <div className="bg-white/20 text-white px-3 py-1 rounded-full text-sm font-medium">
                  {filteredThreads.length}
                </div>
              </div>
            </div>
            <div className="p-6 max-h-96 overflow-y-auto">
              {filteredThreads.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">No threads found</p>
                  <p className="text-gray-400 text-sm">Create your first conversation</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredThreads.map((thread) => (
                    <div
                      key={thread.id}
                      onClick={() => setSelectedThread(thread)}
                      className={`p-4 rounded-2xl cursor-pointer transition-all duration-300 border-2 ${
                        selectedThread?.id === thread.id
                          ? 'bg-gradient-to-r from-blue-50 to-purple-50 border-blue-300 shadow-lg'
                          : 'bg-gray-50 border-transparent hover:bg-white hover:shadow-md hover:border-gray-200'
                      }`}
                    >
                      <h3 className="font-semibold text-gray-900 truncate mb-2">{thread.title}</h3>
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <span className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {new Date(thread.created_at).toLocaleDateString()}
                        </span>
                        <span className="flex items-center bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                          <MessageSquare className="h-3 w-3 mr-1" />
                          {thread.message_count || 0}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Center Panel - Messages/Chat */}
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-teal-600 p-6">
              <h2 className="text-2xl font-bold text-white flex items-center">
                <Eye className="h-7 w-7 mr-3" />
                {selectedThread ? 'Messages' : 'Select a Thread'}
              </h2>
            </div>
            <div className="p-6 h-96 overflow-y-auto">
              {selectedThread ? (
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-2xl border border-blue-200">
                    <h3 className="font-bold text-gray-900 mb-2">{selectedThread.title}</h3>
                    <p className="text-sm text-gray-600">
                      Created: {new Date(selectedThread.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-center py-12">
                    <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">Messages will appear here</p>
                    <p className="text-gray-400 text-sm">Click on a thread to view messages</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">Select a thread to view messages</p>
                  <p className="text-gray-400 text-sm">Choose from the threads on the left</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Files & Metadata */}
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 overflow-hidden">
            <div className="bg-gradient-to-r from-orange-500 to-red-600 p-6">
              <h2 className="text-2xl font-bold text-white flex items-center">
                <FileText className="h-7 w-7 mr-3" />
                Files & Metadata
              </h2>
            </div>
            <div className="p-6 max-h-96 overflow-y-auto">
              <div className="space-y-4">
                {/* File Upload Zone */}
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-2xl border-2 border-dashed border-purple-200">
                  <div className="text-center">
                    <Upload className="h-12 w-12 text-purple-400 mx-auto mb-3" />
                    <h3 className="font-semibold text-gray-900 mb-2">Upload Files</h3>
                    <p className="text-sm text-gray-600 mb-4">Drag and drop files here</p>
                    <button className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-2 rounded-xl hover:shadow-lg transition-all duration-300 flex items-center mx-auto">
                      <Plus className="h-4 w-4 mr-2" />
                      Choose Files
                    </button>
                  </div>
                </div>

                {/* Files List */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <Database className="h-5 w-5 mr-2" />
                    Recent Files ({filteredFiles.length})
                  </h3>
                  {filteredFiles.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">No files uploaded yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredFiles.slice(0, 5).map((file) => (
                        <div
                          key={file.id}
                          className="p-3 bg-gray-50 rounded-xl hover:bg-white hover:shadow-md transition-all duration-300 cursor-pointer"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <FileText className="h-5 w-5 text-blue-500 mr-3" />
                              <div>
                                <p className="font-medium text-gray-900 text-sm truncate">{file.filename}</p>
                                <p className="text-xs text-gray-500">
                                  {(file.size_bytes / 1024).toFixed(1)} KB
                                </p>
                              </div>
                            </div>
                            <div className="flex space-x-1">
                              <button className="p-1 text-gray-400 hover:text-blue-500 transition-colors">
                                <Eye className="h-4 w-4" />
                              </button>
                              <button className="p-1 text-gray-400 hover:text-green-500 transition-colors">
                                <Download className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Panel - System Logs */}
        <div className="mt-8 bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 overflow-hidden">
          <div className="bg-gradient-to-r from-gray-600 to-gray-800 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white flex items-center">
                <Activity className="h-7 w-7 mr-3" />
                System Logs
              </h2>
              <div className="bg-white/20 text-white px-3 py-1 rounded-full text-sm font-medium">
                Last 20 entries
              </div>
            </div>
          </div>
          <div className="p-6">
            {filteredLogs.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No logs available</p>
                <p className="text-gray-400 text-sm">System logs will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    className={`p-4 rounded-2xl border-l-4 ${
                      log.level === 'error'
                        ? 'bg-red-50 border-red-400'
                        : log.level === 'warning'
                        ? 'bg-yellow-50 border-yellow-400'
                        : 'bg-green-50 border-green-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        {log.level === 'error' ? (
                          <AlertCircle className="h-5 w-5 text-red-500 mr-3" />
                        ) : log.level === 'warning' ? (
                          <AlertCircle className="h-5 w-5 text-yellow-500 mr-3" />
                        ) : (
                          <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                        )}
                        <div>
                          <p className="font-medium text-gray-900">{log.message}</p>
                          {log.url && (
                            <p className="text-sm text-gray-500">
                              {log.method} {log.url}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <Clock className="h-4 w-4 mr-1" />
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}