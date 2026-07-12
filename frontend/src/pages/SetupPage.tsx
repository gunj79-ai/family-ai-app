import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function SetupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    appName: 'FamilyAI',
    appTagline: 'Your private family AI assistant',
    primaryColor: '#6366f1',
    adminUsername: '',
    adminPassword: '',
    adminDisplayName: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (k: string, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (form.adminPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/config/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Setup failed');
      }
      navigate('/login');
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface-subtle dark:bg-gray-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Welcome — Let's set up your app
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">This only runs once</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 pb-2">
              App Identity
            </p>
            <Input
              id="appName"
              label="App Name"
              value={form.appName}
              onChange={(e) => update('appName', e.target.value)}
            />
            <Input
              id="appTagline"
              label="Tagline"
              value={form.appTagline}
              onChange={(e) => update('appTagline', e.target.value)}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Primary Color
              </label>
              <input
                type="color"
                value={form.primaryColor}
                onChange={(e) => update('primaryColor', e.target.value)}
                className="h-10 w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 cursor-pointer"
              />
            </div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 pb-2 pt-2">
              Admin Account
            </p>
            <Input
              id="adminDisplayName"
              label="Your Name"
              value={form.adminDisplayName}
              onChange={(e) => update('adminDisplayName', e.target.value)}
              placeholder="e.g. Dad"
              required
            />
            <Input
              id="adminUsername"
              label="Username"
              value={form.adminUsername}
              onChange={(e) => update('adminUsername', e.target.value)}
              required
            />
            <Input
              id="adminPassword"
              label="Password"
              type="password"
              value={form.adminPassword}
              onChange={(e) => update('adminPassword', e.target.value)}
              required
            />
            {error && (
              <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
                {error}
              </div>
            )}
            <Button type="submit" className="w-full" size="lg" loading={loading}>
              Finish Setup
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
