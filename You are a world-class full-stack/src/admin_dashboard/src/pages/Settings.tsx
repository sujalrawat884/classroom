import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { axiosInstance } from '../stores/authStore';
import {
  Cog6ToothIcon,
  ShieldCheckIcon,
  ServerIcon,
  BellIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';

interface SystemSettings {
  max_concurrent_requests: number;
  request_timeout: number;
  rate_limit_per_user: number;
  max_context_length: number;
  enable_logging: boolean;
  log_level: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR';
  enable_metrics: boolean;
  cors_origins: string[];
  jwt_expiry_minutes: number;
  max_users: number;
  require_email_verification: boolean;
  allow_user_registration: boolean;
}

export default function Settings() {
  const [settings, setSettings] = useState<SystemSettings>({
    max_concurrent_requests: 10,
    request_timeout: 30,
    rate_limit_per_user: 100,
    max_context_length: 4096,
    enable_logging: true,
    log_level: 'INFO',
    enable_metrics: true,
    cors_origins: ['http://localhost:3000', 'http://localhost:8080'],
    jwt_expiry_minutes: 30,
    max_users: 100,
    require_email_verification: false,
    allow_user_registration: true,
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  const tabs = [
    { id: 'general', name: 'General', icon: Cog6ToothIcon },
    { id: 'security', name: 'Security', icon: ShieldCheckIcon },
    { id: 'performance', name: 'Performance', icon: ServerIcon },
    { id: 'logging', name: 'Logging & Monitoring', icon: DocumentTextIcon },
    { id: 'notifications', name: 'Notifications', icon: BellIcon },
  ];

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      // Since we don't have a settings endpoint, we'll use mock data
      // In a real implementation, this would fetch from /api/admin/settings
      setSettings(settings);
    } catch (error: any) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to fetch settings');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      // In a real implementation, this would POST to /api/admin/settings
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      toast.success('Settings saved successfully');
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (key: keyof SystemSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleCorsOriginsChange = (value: string) => {
    const origins = value.split('\n').filter(origin => origin.trim() !== '');
    handleInputChange('cors_origins', origins);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Configure system settings and preferences
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar */}
        <div className="lg:w-64">
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                  activeTab === tab.id
                    ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-200'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white'
                }`}
              >
                <tab.icon className="mr-3 h-5 w-5" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="card">
            {activeTab === 'general' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">General Settings</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="label">Maximum Users</label>
                    <input
                      type="number"
                      className="input"
                      value={settings.max_users}
                      onChange={(e) => handleInputChange('max_users', parseInt(e.target.value) || 0)}
                      min={1}
                      max={1000}
                    />
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Maximum number of users allowed in the system
                    </p>
                  </div>

                  <div>
                    <label className="label">JWT Token Expiry (minutes)</label>
                    <input
                      type="number"
                      className="input"
                      value={settings.jwt_expiry_minutes}
                      onChange={(e) => handleInputChange('jwt_expiry_minutes', parseInt(e.target.value) || 30)}
                      min={5}
                      max={1440}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="allow_registration"
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      checked={settings.allow_user_registration}
                      onChange={(e) => handleInputChange('allow_user_registration', e.target.checked)}
                    />
                    <label htmlFor="allow_registration" className="ml-2 block text-sm text-gray-900 dark:text-white">
                      Allow User Registration
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="require_email"
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      checked={settings.require_email_verification}
                      onChange={(e) => handleInputChange('require_email_verification', e.target.checked)}
                    />
                    <label htmlFor="require_email" className="ml-2 block text-sm text-gray-900 dark:text-white">
                      Require Email Verification
                    </label>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Security Settings</h3>
                
                <div>
                  <label className="label">CORS Origins</label>
                  <textarea
                    className="input"
                    rows={4}
                    value={settings.cors_origins.join('\n')}
                    onChange={(e) => handleCorsOriginsChange(e.target.value)}
                    placeholder="http://localhost:3000&#10;http://localhost:8080"
                  />
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    One origin per line. These domains will be allowed to make requests to the API.
                  </p>
                </div>

                <div>
                  <label className="label">Rate Limit per User (requests/hour)</label>
                  <input
                    type="number"
                    className="input"
                    value={settings.rate_limit_per_user}
                    onChange={(e) => handleInputChange('rate_limit_per_user', parseInt(e.target.value) || 0)}
                    min={1}
                    max={10000}
                  />
                </div>
              </div>
            )}

            {activeTab === 'performance' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Performance Settings</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="label">Max Concurrent Requests</label>
                    <input
                      type="number"
                      className="input"
                      value={settings.max_concurrent_requests}
                      onChange={(e) => handleInputChange('max_concurrent_requests', parseInt(e.target.value) || 0)}
                      min={1}
                      max={100}
                    />
                  </div>

                  <div>
                    <label className="label">Request Timeout (seconds)</label>
                    <input
                      type="number"
                      className="input"
                      value={settings.request_timeout}
                      onChange={(e) => handleInputChange('request_timeout', parseInt(e.target.value) || 0)}
                      min={5}
                      max={300}
                    />
                  </div>

                  <div>
                    <label className="label">Max Context Length</label>
                    <input
                      type="number"
                      className="input"
                      value={settings.max_context_length}
                      onChange={(e) => handleInputChange('max_context_length', parseInt(e.target.value) || 0)}
                      min={1024}
                      max={32768}
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'logging' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Logging & Monitoring</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="enable_logging"
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      checked={settings.enable_logging}
                      onChange={(e) => handleInputChange('enable_logging', e.target.checked)}
                    />
                    <label htmlFor="enable_logging" className="ml-2 block text-sm text-gray-900 dark:text-white">
                      Enable System Logging
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="enable_metrics"
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      checked={settings.enable_metrics}
                      onChange={(e) => handleInputChange('enable_metrics', e.target.checked)}
                    />
                    <label htmlFor="enable_metrics" className="ml-2 block text-sm text-gray-900 dark:text-white">
                      Enable Metrics Collection
                    </label>
                  </div>
                </div>

                <div>
                  <label className="label">Log Level</label>
                  <select
                    className="input"
                    value={settings.log_level}
                    onChange={(e) => handleInputChange('log_level', e.target.value as 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR')}
                  >
                    <option value="DEBUG">Debug</option>
                    <option value="INFO">Info</option>
                    <option value="WARNING">Warning</option>
                    <option value="ERROR">Error</option>
                  </select>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Higher levels include all lower level messages
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Notification Settings</h3>
                
                <div className="space-y-4">
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">Email Notifications</h4>
                    <div className="space-y-3">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="notify_user_registration"
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <label htmlFor="notify_user_registration" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                          New user registrations
                        </label>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="notify_system_errors"
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <label htmlFor="notify_system_errors" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                          System errors and failures
                        </label>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="notify_high_usage"
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <label htmlFor="notify_high_usage" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                          High system usage alerts
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">Slack Integration</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="label">Webhook URL</label>
                        <input
                          type="url"
                          className="input"
                          placeholder="https://hooks.slack.com/..."
                        />
                      </div>
                      <div>
                        <label className="label">Channel</label>
                        <input
                          type="text"
                          className="input"
                          placeholder="#ai-assistant-alerts"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Save Button */}
            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => fetchSettings()}
                  disabled={saving}
                >
                  Reset
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={saveSettings}
                  disabled={saving}
                >
                  {saving ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </div>
                  ) : (
                    'Save Settings'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
