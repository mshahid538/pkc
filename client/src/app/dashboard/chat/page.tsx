'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useUser } from '@clerk/nextjs';
import { Send, MessageSquare, Plus, FileText, User, Bot, Trash2, MoreVertical } from 'lucide-react';
import { getApiUrl } from '@/config/api';
import { isNetworkError, getNetworkErrorMessage, checkNetworkConnectivity } from '@/utils/network';
import ErrorBoundary from '@/components/ErrorBoundary';
import NetworkStatus from '@/components/NetworkStatus';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

interface Thread {
  id: string;
  title: string;
  created_at: string;
  message_count?: number;
}


const validateAndRefreshToken = async (getToken: any, context: string = '') => {
  try {
    let token = await getToken();
    
    if (!token) {
      console.log(`No token available in ${context}, attempting refresh...`);
      try {
        token = await getToken({ skipCache: true });
        if (token) {
          console.log(`Token refreshed successfully in ${context}`);
        }
      } catch (refreshError) {
        console.error(`Token refresh failed in ${context}:`, refreshError);
      }
    }
    
    return token;
  } catch (error) {
    console.error(`Token validation error in ${context}:`, error);
    return null;
  }
};

export default function ChatPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const { getToken } = useAuth();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [lastFetchedThreadId, setLastFetchedThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [deletingThreadId, setDeletingThreadId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [initialLoading, setInitialLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentThreadIdRef = useRef<string | null>(null);
  const threadsRef = useRef<any[]>([]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };


  const retryAuthentication = async () => {
    console.log('Retrying authentication...');
    setRetryCount(prev => prev + 1);
    setAuthError(null);
    setInitialLoading(true);
    
    try {
      const token = await getToken({ skipCache: true });
      
      if (token) {
        console.log('Authentication retry successful');
        await fetchThreads();
      } else {
        setAuthError('Authentication retry failed. Please sign in again.');
      }
    } catch (error) {
      console.error('Authentication retry error:', error);
      setAuthError('Authentication retry failed. Please sign in again.');
    } finally {
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);


  useEffect(() => {
    if (isLoaded && isSignedIn) {
      setAuthError(null);
      setInitialLoading(true);
      

      validateAndRefreshToken(getToken, 'component mount').then(token => {
        if (token) {
      checkNetworkConnectivity().then(isConnected => {
        if (isConnected) {
              fetchThreads().finally(() => {
                setInitialLoading(false);
              });
        } else {
          setAuthError('Network connection issue. Please check your internet connection and try again.');
              setInitialLoading(false);
            }
          });
        } else {
          setAuthError('Authentication token validation failed. Please sign in again.');
          setInitialLoading(false);
        }
      });
    } else if (isLoaded && !isSignedIn) {
      setAuthError('Please sign in to access the chat');
      setInitialLoading(false);
    }
  }, [isLoaded, isSignedIn, getToken]);


  useEffect(() => {
    if (isLoaded && isSignedIn) {
      const interval = setInterval(async () => {
        const token = await validateAndRefreshToken(getToken, 'periodic check');
        if (!token) {
          console.warn('Periodic token validation failed');
          setAuthError('Session expired. Please sign in again.');
        }
      }, 5 * 60 * 1000);

      return () => clearInterval(interval);
    }
  }, [isLoaded, isSignedIn, getToken]);

  const fetchThreads = async (retryCount = 0, preserveSelection = false) => {
    try {
      setAuthError(null);
      

      let token = await getToken();
      
      if (!token) {
        try {
          token = await getToken({ skipCache: true });
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
        }
      
        if (!token) {
          setAuthError('Authentication token not available. Please sign in again.');
          return;
        }
      }

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      };

      const apiUrl = getApiUrl('CHAT', '');

      const response = await fetch(apiUrl, { 
        headers,
        signal: AbortSignal.timeout(30000) 
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          if (retryCount === 0) {
            try {
              const refreshedToken = await getToken({ skipCache: true });
              if (refreshedToken) {
                return fetchThreads(1); 
              }
            } catch (refreshError) {
              console.error('Token refresh failed:', refreshError);
            }
          }
          setAuthError('Authentication failed. Please sign in again.');
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.data && Array.isArray(data.data.conversations)) {
        if (preserveSelection && selectedThread) {
          setThreads(prevThreads => {
            const serverThreadIds = new Set(data.data.conversations.map((t: any) => t.id));
            const localThreadsNotOnServer = prevThreads.filter(t => !serverThreadIds.has(t.id));
            const mergedThreads = [...data.data.conversations, ...localThreadsNotOnServer];
            threadsRef.current = mergedThreads;
            return mergedThreads;
          });
          
          const currentThread = data.data.conversations.find((t: any) => t.id === selectedThread.id);
          if (currentThread) {
            setSelectedThread(currentThread);
          }
        } else {
          if (selectedThread) {
            const serverThreadIds = new Set(data.data.conversations.map((t: any) => t.id));
            if (!serverThreadIds.has(selectedThread.id)) {
              const updatedThreads = [selectedThread, ...data.data.conversations];
              setThreads(updatedThreads);
              threadsRef.current = updatedThreads;
            } else {
              setThreads(data.data.conversations);
              threadsRef.current = data.data.conversations;
            }
          } else {
            setThreads(data.data.conversations);
            threadsRef.current = data.data.conversations;
          }
          
          if (data.data.conversations.length > 0) {
            const firstThread = data.data.conversations[0];
            setSelectedThread(firstThread);
            fetchMessages(firstThread.id);
          }
        }
      } else {
        setThreads([]);
        threadsRef.current = [];
        console.warn('API returned unexpected data structure:', data);
      }
    } catch (error) {
      console.error('Failed to fetch threads:', error);
      if (isNetworkError(error) && retryCount < 1) {
        setTimeout(() => fetchThreads(retryCount + 1), 2000);
        return;
      }
      
      if (isNetworkError(error)) {
        setAuthError('Unable to load conversations. Please try again.');
      } else {
        setAuthError('Failed to load conversations. Please try refreshing the page.');
      }
      setThreads([]);
      threadsRef.current = [];
    }
  };

  const fetchMessages = useCallback(async (threadId: string) => {
    try {
      setLoading(true);
      setAuthError(null);
      
      if (!isSignedIn) {
        setAuthError('Please sign in to view messages.');
        return;
      }


      let token = await getToken();
      
      if (!token) {
        console.log('No token for fetchMessages, attempting refresh...');
        try {
          token = await getToken({ skipCache: true });
        } catch (refreshError) {
          console.error('Token refresh failed in fetchMessages:', refreshError);
        }
        
        if (!token) {
          setAuthError('Authentication token not available. Please sign in again.');
          return;
        }
      }

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      };

      console.log('Fetching messages for thread ID:', threadId);
      const response = await fetch(getApiUrl('CHAT', `/${threadId}`), { headers });
      
      if (response.status === 401) {
        setAuthError('Authentication failed. Please refresh the page and try again.');
        return;
      }
      
      const data = await response.json();

      if (data.success && data.data && Array.isArray(data.data.messages)) {
        console.log('Fetched messages for thread:', threadId, 'Count:', data.data.messages.length);
        setMessages(data.data.messages);
        setLastFetchedThreadId(threadId); 
      } else {
        console.warn('API returned unexpected messages data structure:', data);
        setMessages([]);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      if (isNetworkError(error)) {
        setAuthError('Network connection issue. Please check your internet connection and try again.');
      } else {
        setAuthError('Failed to load messages. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [getToken, isSignedIn]);

  const deleteConversation = async (threadId: string) => {
    try {
      setDeletingThreadId(threadId);
      setAuthError(null);

      const token = await getToken();
      if (!token) {
        setAuthError('Authentication token not available. Please sign in again.');
        return;
      }

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      };

      const response = await fetch(getApiUrl('CHAT', `/${threadId}`), {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        if (response.status === 401) {
          setAuthError('Authentication failed. Please sign in again.');
        } else if (response.status === 404) {
          setAuthError('Conversation not found.');
        } else {
          setAuthError(`Failed to delete conversation. Server error: ${response.status}`);
        }
        return;
      }

      const data = await response.json();

      if (data.success) {
        setThreads(prev => prev.filter(thread => thread.id !== threadId));
        
        if (selectedThread?.id === threadId) {
          setSelectedThread(null);
          setMessages([]);
          setLastFetchedThreadId(null);
        }
        
        console.log('Conversation deleted successfully:', threadId);
      } else {
        setAuthError('Failed to delete conversation. Please try again.');
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      if (isNetworkError(error)) {
        setAuthError('Network connection issue. Please check your internet connection and try again.');
      } else {
        setAuthError('Failed to delete conversation. Please try again.');
      }
    } finally {
      setDeletingThreadId(null);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    const messageContent = newMessage.trim();
    
    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: messageContent,
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setNewMessage('');
    setSending(true);
    setIsTyping(true);

    try {
      let token = await getToken();

      if (!token) {
        try {
          token = await getToken({ skipCache: true });
        } catch (refreshError) {
          console.error('Token refresh failed in sendMessage:', refreshError);
        }

        if (!token) {
          setAuthError('Authentication token not available. Please sign in again.');
          setMessages(prev => prev.filter(m => m.id !== userMessage.id));
          setNewMessage(messageContent);
          return;
        }
      }

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      };

      const threadId = currentThreadIdRef.current || (selectedThread ? selectedThread.id : null);
      
      const response = await fetch(getApiUrl('CHAT', '/'), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          threadId: threadId,
          message: messageContent,
        }),
      });

      if (!response.ok) {
        setIsTyping(false);
        
        if (response.status === 401) {
          console.error('Authentication failed in sendMessage with 401');
          try {
            const refreshedToken = await getToken({ skipCache: true });
            if (refreshedToken) {
              console.log('Token refreshed in sendMessage, retrying...');
              const retryResponse = await fetch(getApiUrl('CHAT', '/'), {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${refreshedToken}`,
                },
                body: JSON.stringify({
                  threadId: threadId,
                  message: messageContent,
                }),
              });
              
              if (retryResponse.ok) {
                const retryData = await retryResponse.json();
                if (retryData.success && retryData.data && Array.isArray(retryData.data.messages)) {
                  setIsTyping(false);
                  console.log('Retry successful, processing response...');
                  // Process the retry response
                  await processChatResponse(retryData, messageContent);
                  return;
                }
              }
            }
          } catch (retryError) {
            console.error('Retry failed:', retryError);
          }
          
          setAuthError('Authentication failed. Please sign in again.');
        } else {
          setAuthError(`Server error: ${response.status}. Please try again.`);
        }
        setNewMessage(messageContent);
        return;
      }

      const data = await response.json();
      console.log('Server response for sendMessage:', data);

      if (data.success && data.data && Array.isArray(data.data.messages)) {
        setIsTyping(false);
        console.log('Server returned', data.data.messages.length, 'messages');
        await processChatResponse(data, messageContent);
      } else {
        setIsTyping(false);
        console.warn('API returned unexpected send message data structure:', data);
        setAuthError('Failed to send message. Please try again.');
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setIsTyping(false);
      
      if (isNetworkError(error)) {
        setMessages(prev => prev.filter(m => m.id !== userMessage.id));
        setNewMessage(messageContent);
        setAuthError('Unable to send message. Please try again.');
      } else {
        setAuthError('Failed to send message. Please try again.');
      }
    } finally {
      setSending(false);
    }
  };

  const processChatResponse = async (data: any, messageContent: string) => {
    if (data.data.messages && Array.isArray(data.data.messages)) {
      setMessages(data.data.messages);
      setLoading(false);
    } else {
      setLoading(false);
    }
        
    if (!selectedThread && data.data.thread_id) {
      const title = messageContent ? 
        (messageContent.length > 50 ? 
          messageContent.substring(0, 50) + '...' : 
          messageContent) : 
        'New Conversation';
      
      const newThread = {
        id: data.data.thread_id,
        title: title,
        created_at: new Date().toISOString(),
        message_count: data.data.messages.length,
        updated_at: new Date().toISOString(),
      };
      
      setSelectedThread(newThread);
      setLastFetchedThreadId(newThread.id);
      currentThreadIdRef.current = newThread.id;
      
      setThreads(prevThreads => {
        const updatedThreads = [newThread, ...prevThreads];
        threadsRef.current = updatedThreads;
        return updatedThreads;
      });
      
      router.refresh();
    } else if (selectedThread && data.data.thread_id) {
      setLastFetchedThreadId(data.data.thread_id);
    }
  };

  useEffect(() => {
    if (selectedThread && selectedThread.id !== lastFetchedThreadId) {
      setLastFetchedThreadId(selectedThread.id);
      currentThreadIdRef.current = selectedThread.id;
      fetchMessages(selectedThread.id);
    }
  }, [selectedThread?.id]); 
  if (!isLoaded) {
    return (
      <div className="h-[calc(100vh-8rem)] flex items-center justify-center bg-white rounded-2xl shadow-xl">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (initialLoading && isSignedIn && !authError) {
    return (
      <div className="h-[calc(100vh-8rem)] flex flex-col bg-white rounded-2xl shadow-xl overflow-hidden">

        <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
          <NetworkStatus />
        </div>
        
        <div className="flex-1 flex overflow-hidden">

          <div className="w-80 bg-gray-50 border-r border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="h-6 bg-gray-200 rounded w-32 animate-pulse"></div>
                <div className="h-8 w-8 bg-gray-200 rounded-lg animate-pulse"></div>
              </div>
            </div>
            
            <div className="flex-1 p-2">
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="p-3 rounded-lg bg-white border border-gray-200">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2 animate-pulse"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>


          <div className="flex-1 flex flex-col">
            {/* Chat Header Skeleton */}
            <div className="p-4 border-b border-gray-200 bg-white">
              <div className="flex items-center justify-between">
                <div>
                  <div className="h-6 bg-gray-200 rounded w-48 mb-2 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                </div>
                <div className="h-8 w-8 bg-gray-200 rounded-lg animate-pulse"></div>
              </div>
            </div>


            <div className="flex-1 p-4 overflow-y-auto">
              <div className="space-y-4">

                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                      i % 2 === 0 ? 'bg-blue-100' : 'bg-gray-100'
                    }`}>
                      <div className="h-4 bg-gray-200 rounded w-full mb-1 animate-pulse"></div>
                      <div className="h-3 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 bg-white">
              <div className="flex space-x-2">
                <div className="flex-1 h-10 bg-gray-200 rounded-lg animate-pulse"></div>
                <div className="h-10 w-10 bg-gray-200 rounded-lg animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isSignedIn || authError) {
    return (
      <div className="h-[calc(100vh-8rem)] flex items-center justify-center bg-white rounded-2xl shadow-xl">
        <div className="text-center max-w-md">
          <div className="text-red-500 mb-4">
            <svg className="h-16 w-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {isNetworkError({ message: authError }) ? 'Network Error' : 'Authentication Error'}
          </h2>
          <p className="text-gray-600 mb-4">
            {authError || 'Please sign in to access the chat'}
          </p>
          {authError && authError.includes('Authentication') && (
            <p className="text-sm text-orange-600 mb-2">
              💡 Try clicking &quot;Retry Authentication&quot; to refresh your login session
            </p>
          )}
          <div className="flex space-x-3">
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
            >
              Refresh Page
            </button>
            {isNetworkError({ message: authError }) && (
              <button 
                onClick={() => {
                  setAuthError(null);
                  if (isSignedIn) {
                    checkNetworkConnectivity().then(isConnected => {
                      if (isConnected) {
                        fetchThreads();
                      } else {
                        setAuthError('Network connection issue. Please check your internet connection and try again.');
                      }
                    });
                  }
                }}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
              >
                Retry Connection
              </button>
            )}
            <button 
              onClick={retryAuthentication}
              className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors"
            >
              Retry Authentication
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="h-[calc(100vh-8rem)] flex flex-col bg-white rounded-2xl shadow-xl overflow-hidden">

        <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
          <NetworkStatus />
        </div>
        
        <div className="flex-1 flex overflow-hidden">
          <div className="w-80 bg-gray-50 border-r border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Conversations</h2>
                <button
                  onClick={() => {
                    setSelectedThread(null);
                    setMessages([]);
                    setNewMessage('');
                    currentThreadIdRef.current = null;
                  }}
                  className="flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
                  title="Start new conversation"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {(!Array.isArray(threads) || threads.length === 0) && !initialLoading ? (
                <div className="p-4 text-center text-gray-500">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No conversations yet</p>
                  <p className="text-sm">Start a new chat to begin</p>
                </div>
              ) : (!Array.isArray(threads) || threads.length === 0) && initialLoading ? (
                <div className="p-4 text-center text-gray-500">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-3"></div>
                  <p>Loading conversations...</p>
                </div>
              ) : (
                <div className="space-y-1 p-2">
                  {threads.map((thread) => (
                    <div
                      key={thread.id}
                      className={`group relative p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedThread?.id === thread.id
                          ? 'bg-blue-100 border border-blue-200 shadow-sm'
                          : 'hover:bg-gray-100'
                      } ${loading && selectedThread?.id === thread.id ? 'opacity-75' : ''}`}
                    >
                      <div
                        onClick={() => {
                          console.log('Clicked on thread:', thread.id, thread.title);
                          setSelectedThread(thread);
                        
                          fetchMessages(thread.id);
                        
                          setAuthError(null);
                        }}
                        className="pr-8"
                      >
                        <h3 className="font-medium text-gray-900 truncate mb-1 flex items-center gap-2">
                          {thread.title}
                          {loading && selectedThread?.id === thread.id && (
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500"></div>
                          )}
                        </h3>
                        <div className="flex items-center justify-between text-sm text-gray-500">
                          <span>{thread.message_count || 0} messages</span>
                          <span>{new Date(thread.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      
                    
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`Are you sure you want to delete "${thread.title}"? This action cannot be undone.`)) {
                            deleteConversation(thread.id);
                          }
                        }}
                        disabled={deletingThreadId === thread.id}
                        className="absolute top-2 right-2 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-100 text-red-500 hover:text-red-700 disabled:opacity-50"
                        title="Delete conversation"
                      >
                        {deletingThreadId === thread.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500"></div>
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>


          <div className="flex-1 flex flex-col">
            {selectedThread || (messages && messages.length > 0) ? (
              <>

                <div className="p-4 border-b border-gray-200 bg-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                        {selectedThread ? selectedThread.title : 'New Conversation'}
                      </h1>
                      <p className="text-sm text-gray-500">
                        {loading ? 'Loading messages...' : `${messages.length} messages`}
                      </p>
                    </div>
                    {selectedThread && (
                    <button
                      onClick={() => {
                        if (window.confirm(`Are you sure you want to delete "${selectedThread.title}"? This action cannot be undone.`)) {
                          deleteConversation(selectedThread.id);
                        }
                      }}
                      disabled={deletingThreadId === selectedThread.id}
                      className="p-2 rounded-full hover:bg-red-100 text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
                      title="Delete conversation"
                    >
                      {deletingThreadId === selectedThread.id ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-500"></div>
                      ) : (
                        <Trash2 className="h-5 w-5" />
                      )}
                    </button>
                    )}
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {loading ? (
                    <div className="flex justify-center items-center h-full">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    </div>
                  ) : !Array.isArray(messages) || messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                      <MessageSquare className="h-16 w-16 mb-4 text-gray-300" />
                      <p className="text-lg">No messages yet</p>
                      <p className="text-sm">Start the conversation below</p>
                    </div>
                  ) : (
                    messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                            message.role === 'user'
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-100 text-gray-900'
                          }`}
                        >
                          <div className="flex items-start space-x-2">
                            {message.role === 'assistant' && (
                              <Bot className="h-4 w-4 mt-1 text-gray-500 flex-shrink-0" />
                            )}
                            {message.role === 'user' && (
                              <User className="h-4 w-4 mt-1 text-blue-200 flex-shrink-0" />
                            )}
                            <div className="flex-1">
                              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                              <p className={`text-xs mt-1 ${
                                message.role === 'user' ? 'text-blue-200' : 'text-gray-500'
                              }`}>
                                {new Date(message.created_at).toLocaleTimeString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  

                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-2xl bg-gray-100 text-gray-900">
                        <div className="flex items-start space-x-2">
                          <Bot className="h-4 w-4 mt-1 text-gray-500 flex-shrink-0" />
                          <div className="flex-1">
                            <div className="flex items-center space-x-1">
                              <span className="text-sm text-gray-600">PKC is responding</span>
                              <div className="flex space-x-1">
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>


              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageSquare className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    Start a conversation
                  </h2>
                  <p className="text-gray-500 mb-4">
                    Type your message below to begin a new conversation
                  </p>
                </div>
              </div>
            )}
            
            {/* Message input - always visible */}
                <div className="p-4 border-t border-gray-200 bg-white">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                      placeholder="Type your message..."
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={sending}
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!newMessage.trim() || sending}
                      className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                      {sending ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}