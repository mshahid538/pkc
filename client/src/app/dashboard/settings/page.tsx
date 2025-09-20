'use client';

import { useState } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { 
  Settings, 
  User, 
  Bell, 
  Shield, 
  Palette, 
  Database,
  Key,
  Globe,
  Download,
  Upload,
  Trash2,
  Save,
  Eye,
  EyeOff
} from 'lucide-react';

export default function SettingsPage() {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState('profile');
  const [showApiKey, setShowApiKey] = useState(false);

  const tabs = [
    { id: 'profile', name: 'Profile', icon: User },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'security', name: 'Security', icon: Shield },
    { id: 'appearance', name: 'Appearance', icon: Palette },
    { id: 'data', name: 'Data & Privacy', icon: Database },
    { id: 'api', name: 'API Keys', icon: Key },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Profile Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Name
                  </label>
                  <input
                    type="text"
                    defaultValue={user?.firstName || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name
                  </label>
                  <input
                    type="text"
                    defaultValue={user?.lastName || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    defaultValue={user?.emailAddresses[0]?.emailAddress || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Notification Preferences</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">Email Notifications</h4>
                    <p className="text-sm text-gray-600">Receive notifications via email</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">Push Notifications</h4>
                    <p className="text-sm text-gray-600">Receive push notifications in browser</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        );

      case 'security':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Security Settings</h3>
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Two-Factor Authentication</h4>
                  <p className="text-sm text-gray-600 mb-3">Add an extra layer of security to your account</p>
                  <button className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors">
                    Enable 2FA
                  </button>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Change Password</h4>
                  <p className="text-sm text-gray-600 mb-3">Update your account password</p>
                  <button className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors">
                    Change Password
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      case 'appearance':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Appearance Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Theme
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="system">System</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Language
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        );

      case 'data':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Data & Privacy</h3>
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Export Data</h4>
                  <p className="text-sm text-gray-600 mb-3">Download all your data in JSON format</p>
                  <button className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors flex items-center">
                    <Download className="h-4 w-4 mr-2" />
                    Export Data
                  </button>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Import Data</h4>
                  <p className="text-sm text-gray-600 mb-3">Import data from a JSON file</p>
                  <button className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center">
                    <Upload className="h-4 w-4 mr-2" />
                    Import Data
                  </button>
                </div>
                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <h4 className="font-medium text-red-900 mb-2">Delete Account</h4>
                  <p className="text-sm text-red-600 mb-3">Permanently delete your account and all data</p>
                  <button className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors flex items-center">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Account
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      case 'api':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">API Keys</h3>
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Personal API Key</h4>
                  <p className="text-sm text-gray-600 mb-3">Use this key to access the API</p>
                  <div className="flex items-center space-x-2">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value="pk_test_ZW5nYWdpbmctc2VhbC0yNC5jbGVyay5hY2NvdW50cy5kZXYk"
                      readOnly
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                    />
                    <button
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="p-2 text-gray-400 hover:text-gray-600"
                    >
                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                    <button className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors">
                      Copy
                    </button>
                  </div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Generate New Key</h4>
                  <p className="text-sm text-gray-600 mb-3">Create a new API key (old key will be invalidated)</p>
                  <button className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors">
                    Generate New Key
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-600 to-gray-800 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Settings</h1>
            <p className="text-gray-300">Manage your account preferences and configuration</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{tabs.length}</div>
            <div className="text-gray-300 text-sm">Settings Categories</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="flex flex-col lg:flex-row">
          {/* Sidebar */}
          <div className="lg:w-64 bg-gray-50 border-r border-gray-200">
            <nav className="p-4 space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="h-5 w-5 mr-3" />
                    {tab.name}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1 p-6">
            {renderTabContent()}
            
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-end space-x-4">
                <button className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors">
                  Cancel
                </button>
                <button className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center">
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
