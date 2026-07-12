import { useState, useEffect, FormEvent } from 'react';
import { Settings } from 'lucide-react';
import { apiClient } from '@/api/client';
import { useToast } from '@/hooks/useToast';

interface AdminConfig {
  appName: string;
  appTagline: string;
  primaryColor: string;
  defaultModel: string;
  userSystemPrompt: string;
  headroomEnabled: boolean;
}

export function AdminSettings() {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<AdminConfig>({
    appName: 'FamilyAI',
    appTagline: 'Your private family AI assistant',
    primaryColor: '#6366f1',
    defaultModel: 'claude-haiku-4-5-20251001',
    userSystemPrompt: '',
    headroomEnabled: false,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const res = await apiClient.get('/admin/settings');
      const data = res.data;
      setConfig({
        appName: data.app_name || 'FamilyAI',
        appTagline: data.app_tagline || 'Your private family AI assistant',
        primaryColor: data.primary_color || '#6366f1',
        defaultModel: data.default_model || 'claude-haiku-4-5-20251001',
        userSystemPrompt: data.user_system_prompt || '',
        headroomEnabled: data.headroom_enabled === 'true',
      });
    } catch (error) {
      toast.error('Failed to load settings');
    }
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        app_name: config.appName,
        app_tagline: config.appTagline,
        primary_color: config.primaryColor,
        default_model: config.defaultModel,
        user_system_prompt: config.userSystemPrompt,
        headroom_enabled: config.headroomEnabled ? 'true' : 'false',
      };
      await apiClient.put('/admin/settings', payload);
      
      // Apply color immediately
      document.documentElement.style.setProperty('--primary-color', config.primaryColor);
      
      toast.success('Settings updated successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="w-6 h-6 text-blue-600" />
        <h2 className="text-lg font-semibold text-slate-900">App Settings</h2>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        {/* App Settings Section */}
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-4 uppercase tracking-wide">Application</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">App Name</label>
              <input
                type="text"
                value={config.appName}
                onChange={(e) => setConfig({ ...config, appName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">App Tagline</label>
              <input
                type="text"
                value={config.appTagline}
                onChange={(e) => setConfig({ ...config, appTagline: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Primary Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={config.primaryColor}
                  onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                  className="h-10 w-20 rounded-lg border border-slate-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={config.primaryColor}
                  onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                  placeholder="#6366f1"
                />
              </div>
              <p className="mt-2 text-xs text-slate-500">Changes the primary color throughout the app</p>
            </div>
          </div>
        </div>

        {/* AI Settings Section */}
        <div className="pt-8 border-t border-slate-200">
          <h3 className="text-sm font-semibold text-slate-700 mb-4 uppercase tracking-wide">AI Configuration</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Default Model</label>
              <select
                value={config.defaultModel}
                onChange={(e) => setConfig({ ...config, defaultModel: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="claude-haiku-4-5-20251001">Haiku (Fast & Low Cost)</option>
                <option value="claude-sonnet-4-6">Sonnet (Balanced)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Default System Prompt</label>
              <textarea
                value={config.userSystemPrompt}
                onChange={(e) => setConfig({ ...config, userSystemPrompt: e.target.value })}
                placeholder="Custom instructions that apply to all chats by default..."
                rows={6}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              />
              <p className="mt-2 text-xs text-slate-500">Applied to all chat sessions globally</p>
            </div>
          </div>
        </div>

        {/* Optimization Section */}
        <div className="pt-8 border-t border-slate-200">
          <h3 className="text-sm font-semibold text-slate-700 mb-4 uppercase tracking-wide">Optimization</h3>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="headroom"
              checked={config.headroomEnabled}
              onChange={(e) => setConfig({ ...config, headroomEnabled: e.target.checked })}
              className="w-4 h-4 rounded border-slate-300"
            />
            <label htmlFor="headroom" className="text-sm font-medium text-slate-700">
              Enable Headroom Token Compression
            </label>
          </div>
          <p className="mt-2 ml-7 text-xs text-slate-500">Reduces token usage by intelligently compressing context</p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Saving...' : 'Save Settings'}
        </button>
      </form>
    </div>
  );
}
