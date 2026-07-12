import { useState, FormEvent } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/store/authStore';
import { toastSuccess, toastError } from '@/components/ui/Toast';
import { apiClient } from '@/api/client';
import { User } from 'lucide-react';

export function SettingsPage() {
  const { user, settings } = useAuthStore();

  // Profile section
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [theme, setTheme] = useState(settings?.theme || 'system');

  // Password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  // Profile save
  async function handleProfileSave(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await apiClient.put(`/users/${user?.id}/settings`, {
        theme,
      });
      await apiClient.put(`/users/${user?.id}`, {
        displayName,
      });
      toastSuccess('Profile updated');
    } catch (err) {
      toastError('Failed to save profile');
    } finally {
      setLoading(false);
    }
  }

  // Password change
  async function handlePasswordChange(e: FormEvent) {
    e.preventDefault();
    setPasswordError('');

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords don't match");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }

    setPasswordLoading(true);
    try {
      await apiClient.post('/auth/password', {
        currentPassword,
        newPassword,
      });
      toastSuccess('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordError(err.response?.data?.error || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  }

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto py-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
          <User className="w-8 h-8" />
          User Profile
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">Personalize your account and preferences</p>

        {/* Profile Settings */}
        <form onSubmit={handleProfileSave} className="space-y-6 bg-white dark:bg-gray-800 rounded-xl p-6 mb-8">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Display Name
            </label>
            <Input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Theme
            </label>
            <div className="flex gap-3">
              {(['light', 'dark', 'system'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  type="button"
                  className={`px-4 py-2 rounded-lg border-2 transition-colors capitalize ${
                    theme === t
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                      : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <Button type="submit" loading={loading}>
            Save Profile
          </Button>
        </form>

        {/* Password Change Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Change Password</h2>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Current Password
              </label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                disabled={passwordLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                New Password
              </label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setPasswordError('');
                }}
                placeholder="Enter new password (min 8 characters)"
                disabled={passwordLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Confirm Password
              </label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setPasswordError('');
                }}
                placeholder="Confirm new password"
                disabled={passwordLoading}
              />
            </div>

            {passwordError && (
              <div className="text-sm text-red-600 dark:text-red-400">{passwordError}</div>
            )}

            <Button type="submit" loading={passwordLoading}>
              Change Password
            </Button>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
