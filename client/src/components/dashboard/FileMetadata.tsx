'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { 
  Tag, 
  User, 
  Building, 
  Calendar, 
  Hash, 
  MapPin, 
  FileText,
  ChevronDown,
  ChevronRight,
  X
} from 'lucide-react';

interface FileMetadataProps {
  fileId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface EntityData {
  people: string[];
  organizations: string[];
  dates: string[];
  numbers: string[];
  locations: string[];
  other: string[];
}

interface MetadataResponse {
  file_id: string;
  filename: string;
  file_type: string;
  created_at: string;
  entities: EntityData;
  tags: string[];
  relationships: any[];
  metadata_records: number;
}

export default function FileMetadata({ fileId, isOpen, onClose }: FileMetadataProps) {
  const { getToken } = useAuth();
  const [metadata, setMetadata] = useState<MetadataResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['tags']));

  useEffect(() => {
    if (isOpen && fileId) {
      fetchMetadata();
    }
  }, [isOpen, fileId]);

  const fetchMetadata = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/metadata/${fileId}`, { 
        headers 
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.success) {
        setMetadata(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch metadata:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const getTagColor = (tag: string) => {
    const colors: { [key: string]: string } = {
      'work': 'bg-blue-100 text-blue-800',
      'personal': 'bg-green-100 text-green-800',
      'task': 'bg-yellow-100 text-yellow-800',
      'deal': 'bg-purple-100 text-purple-800',
      'idea': 'bg-pink-100 text-pink-800',
      'finance': 'bg-emerald-100 text-emerald-800',
      'health': 'bg-red-100 text-red-800',
      'meeting': 'bg-indigo-100 text-indigo-800',
      'project': 'bg-cyan-100 text-cyan-800',
      'research': 'bg-teal-100 text-teal-800',
      'legal': 'bg-gray-100 text-gray-800',
      'contract': 'bg-orange-100 text-orange-800',
      'invoice': 'bg-lime-100 text-lime-800',
      'report': 'bg-slate-100 text-slate-800',
      'presentation': 'bg-violet-100 text-violet-800',
      'notes': 'bg-amber-100 text-amber-800',
      'documentation': 'bg-stone-100 text-stone-800',
      'education': 'bg-sky-100 text-sky-800',
      'travel': 'bg-rose-100 text-rose-800',
      'reference': 'bg-neutral-100 text-neutral-800'
    };
    return colors[tag] || 'bg-gray-100 text-gray-800';
  };

  const EntitySection = ({ 
    title, 
    icon: Icon, 
    entities, 
    sectionKey 
  }: { 
    title: string; 
    icon: any; 
    entities: string[]; 
    sectionKey: string;
  }) => {
    if (!entities || entities.length === 0) return null;

    const isExpanded = expandedSections.has(sectionKey);

    return (
      <div className="border-b border-gray-200 last:border-b-0">
        <button
          onClick={() => toggleSection(sectionKey)}
          className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50"
        >
          <div className="flex items-center space-x-2">
            <Icon className="h-4 w-4 text-gray-500" />
            <span className="font-medium text-gray-900">{title}</span>
            <span className="text-sm text-gray-500">({entities.length})</span>
          </div>
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-400" />
          )}
        </button>
        {isExpanded && (
          <div className="px-3 pb-3">
            <div className="flex flex-wrap gap-1">
              {entities.map((entity, index) => (
                <span
                  key={index}
                  className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                >
                  {entity}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900">File Metadata</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading ? (
            <div className="p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-500">Loading metadata...</p>
            </div>
          ) : metadata ? (
            <div className="p-4">
              <div className="mb-4">
                <h3 className="font-medium text-gray-900 truncate">{metadata.filename}</h3>
                <p className="text-sm text-gray-500">
                  {metadata.file_type?.toUpperCase()} • {metadata.metadata_records} metadata record(s)
                </p>
              </div>

              {/* Tags Section */}
              {metadata.tags && metadata.tags.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                    <Tag className="h-4 w-4 mr-2" />
                    Tags
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {metadata.tags.map((tag, index) => (
                      <span
                        key={index}
                        className={`inline-block px-3 py-1 text-sm rounded-full ${getTagColor(tag)}`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Entities Section */}
              {metadata.entities && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Extracted Entities</h4>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <EntitySection
                      title="People"
                      icon={User}
                      entities={metadata.entities.people || []}
                      sectionKey="people"
                    />
                    <EntitySection
                      title="Organizations"
                      icon={Building}
                      entities={metadata.entities.organizations || []}
                      sectionKey="organizations"
                    />
                    <EntitySection
                      title="Dates"
                      icon={Calendar}
                      entities={metadata.entities.dates || []}
                      sectionKey="dates"
                    />
                    <EntitySection
                      title="Numbers"
                      icon={Hash}
                      entities={metadata.entities.numbers || []}
                      sectionKey="numbers"
                    />
                    <EntitySection
                      title="Locations"
                      icon={MapPin}
                      entities={metadata.entities.locations || []}
                      sectionKey="locations"
                    />
                    <EntitySection
                      title="Other"
                      icon={FileText}
                      entities={metadata.entities.other || []}
                      sectionKey="other"
                    />
                  </div>
                </div>
              )}

              {/* Relationships Section */}
              {metadata.relationships && metadata.relationships.length > 0 && (
                <div className="mt-6">
                  <h4 className="font-medium text-gray-900 mb-2">Relationships</h4>
                  <div className="space-y-2">
                    {metadata.relationships.map((rel, index) => (
                      <div key={index} className="p-2 bg-gray-50 rounded">
                        <pre className="text-sm text-gray-600">{JSON.stringify(rel, null, 2)}</pre>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 text-center">
              <p className="text-gray-500">No metadata available for this file.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
