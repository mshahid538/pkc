'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { 
  Upload, 
  FileText, 
  Download, 
  Trash2, 
  Search, 
  Filter,
  Calendar,
  HardDrive,
  File,
  FileImage,
  FileVideo,
  FileAudio,
  Archive
} from 'lucide-react';

interface FileItem {
  id: string;
  filename: string;
  mime: string;
  size_bytes: number;
  created_at: string;
  user_id: string;
}

export default function FilesPage() {
  const { getToken } = useAuth();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/upload`, { headers });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();

      if (data.success) {
        setFiles(data.data?.files || []);
      } else {
        console.error('API returned error:', data.message);
        setFiles([]);
      }
    } catch (error) {
      console.error('Failed to fetch files:', error);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    let successCount = 0;
    let errorCount = 0;
    
    try {
      const token = await getToken();
      
      for (const file of Array.from(files)) {
        try {
          const formData = new FormData();
          formData.append('file', file);

          const headers: HeadersInit = {};
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }

          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/upload`, {
            method: 'POST',
            headers,
            body: formData,
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json();
          if (data.success) {
            successCount++;
          } else {
            console.error('Upload failed for', file.name, ':', data.message);
            errorCount++;
          }
        } catch (fileError) {
          console.error('Upload error for', file.name, ':', fileError);
          errorCount++;
        }
      }

      // Show upload results
      if (successCount > 0 && errorCount === 0) {
        alert(`Successfully uploaded ${successCount} file(s)!`);
      } else if (successCount > 0 && errorCount > 0) {
        alert(`Uploaded ${successCount} file(s) successfully, ${errorCount} failed.`);
      } else {
        alert(`Upload failed for all ${errorCount} file(s).`);
      }

      await fetchFiles(); // Refresh the file list
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
      // Reset the file input
      event.target.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mime: string) => {
    if (mime.startsWith('image/')) return FileImage;
    if (mime.startsWith('video/')) return FileVideo;
    if (mime.startsWith('audio/')) return FileAudio;
    if (mime.includes('pdf')) return FileText;
    if (mime.includes('zip') || mime.includes('rar')) return Archive;
    return File;
  };

  const handleDownload = async (fileId: string, filename: string) => {
    try {
      setDownloading(fileId);
      const token = await getToken();
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/upload/${fileId}/download`, {
        headers,
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        console.error('Download failed');
        alert('Download failed. Please try again.');
      }
    } catch (error) {
      console.error('Download error:', error);
      alert('Download failed. Please try again.');
    } finally {
      setDownloading(null);
    }
  };

  const handleDelete = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return;

    try {
      setDeleting(fileId);
      const token = await getToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/upload/${fileId}`, {
        method: 'DELETE',
        headers,
      });

      if (response.ok) {
        await fetchFiles(); // Refresh the file list
        alert('File deleted successfully!');
      } else {
        console.error('Delete failed with status:', response.status);
        if (response.status === 404) {
          alert('File not found or you do not have permission to delete it.');
        } else {
          alert('Delete failed. Please try again.');
        }
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Delete failed. Please try again.');
    } finally {
      setDeleting(null);
    }
  };

  const filteredFiles = Array.isArray(files) ? files.filter(file =>
    file.filename.toLowerCase().includes(searchQuery.toLowerCase())
  ) : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500 to-teal-600 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">File Manager</h1>
            <p className="text-green-100">Upload, organize, and manage your files</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{Array.isArray(files) ? files.length : 0}</div>
            <div className="text-green-100 text-sm">Total Files</div>
          </div>
        </div>
      </div>

      {/* Upload Area */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
        <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center hover:border-blue-400 transition-colors">
          <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload Files</h3>
          <p className="text-gray-600 mb-4">
            Drag and drop files here, or click to browse
          </p>
          <input
            type="file"
            multiple
            onChange={handleFileUpload}
            disabled={uploading}
            className="hidden"
            id="file-upload"
            accept=".pdf,.txt,.md,.doc,.docx,.xls,.xlsx,.csv,.jpg,.jpeg,.png,.gif"
          />
          <label
            htmlFor="file-upload"
            className={`inline-flex items-center px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg cursor-pointer transition-colors ${
              uploading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Choose Files
              </>
            )}
          </label>
          <p className="text-xs text-gray-500 mt-2">
            Supported: PDF, TXT, MD, DOC, DOCX, XLS, XLSX, CSV, Images
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button className="p-2 text-gray-400 hover:text-gray-600 border border-gray-300 rounded-lg">
            <Filter className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Files Grid */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Your Files ({filteredFiles.length})
            </h2>
            {selectedFiles.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">
                  {selectedFiles.length} selected
                </span>
                <button className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading files...</p>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="p-12 text-center">
            <HardDrive className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {searchQuery ? 'No files found' : 'No files uploaded yet'}
            </h3>
            <p className="text-gray-500">
              {searchQuery 
                ? 'Try adjusting your search terms'
                : 'Upload your first file to get started'
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-6">
            {filteredFiles.map((file) => {
              const FileIcon = getFileIcon(file.mime);
              const isSelected = selectedFiles.includes(file.id);
              
              return (
                <div
                  key={file.id}
                  className={`p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                  }`}
                  onClick={() => {
                    if (isSelected) {
                      setSelectedFiles(prev => prev.filter(id => id !== file.id));
                    } else {
                      setSelectedFiles(prev => [...prev, file.id]);
                    }
                  }}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 rounded-lg ${
                      isSelected ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'
                    }`}>
                      <FileIcon className="h-6 w-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate mb-1">
                        {file.filename}
                      </h3>
                      <div className="flex items-center text-sm text-gray-500 space-x-2">
                        <span>{formatFileSize(file.size_bytes)}</span>
                        <span>•</span>
                        <span className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {new Date(file.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-gray-500 capitalize">
                      {file.mime.split('/')[0]}
                    </span>
                    <div className="flex items-center space-x-1">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(file.id, file.filename);
                        }}
                        disabled={downloading === file.id || deleting === file.id}
                        className={`p-1 transition-colors ${
                          downloading === file.id || deleting === file.id
                            ? 'text-gray-300 cursor-not-allowed'
                            : 'text-gray-400 hover:text-blue-500'
                        }`}
                        title={downloading === file.id ? "Downloading..." : "Download file"}
                      >
                        {downloading === file.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                        ) : (
                        <Download className="h-4 w-4" />
                        )}
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(file.id);
                        }}
                        disabled={downloading === file.id || deleting === file.id}
                        className={`p-1 transition-colors ${
                          downloading === file.id || deleting === file.id
                            ? 'text-gray-300 cursor-not-allowed'
                            : 'text-gray-400 hover:text-red-500'
                        }`}
                        title={deleting === file.id ? "Deleting..." : "Delete file"}
                      >
                        {deleting === file.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500"></div>
                        ) : (
                        <Trash2 className="h-4 w-4" />
                        )}
                      </button>
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
