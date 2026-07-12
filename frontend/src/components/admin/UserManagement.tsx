import { useState, useEffect } from 'react';
import { Users, Plus, Trash2, Edit2, X, Check, Lock } from 'lucide-react';
import { apiClient } from '@/api/client';
import { useToast } from '@/hooks/useToast';
import type { User } from '@/types';

export function UserManagement() {
  const toast = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [resettingPasswordUserId, setResettingPasswordUserId] = useState<string | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState('');
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    displayName: '',
    role: 'teen' as const,
    age: '',
  });
  const [editData, setEditData] = useState<Partial<User> | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    try {
      setLoading(true);
      const response = await apiClient.get('/users');
      setUsers(response.data);
    } catch (error) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.username.trim()) {
      toast.error('Username is required');
      return;
    }

    if (!formData.password || formData.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setIsCreatingUser(true);
    try {
      const payload = {
        username: formData.username.trim(),
        password: formData.password,
        displayName: formData.displayName || formData.username,
        role: formData.role,
        age: formData.age ? parseInt(formData.age, 10) : null,
      };

      const response = await apiClient.post('/users', payload);
      console.log('User created:', response.data);
      toast.success(`User ${formData.username} created successfully`);
      
      // Reset form and reload
      setFormData({
        username: '',
        password: '',
        displayName: '',
        role: 'teen',
        age: '',
      });
      setIsAddingUser(false);
      await loadUsers();
    } catch (error: any) {
      console.error('Create user error:', error);
      const errorMsg = error?.response?.data?.error || error?.message || 'Failed to create user';
      toast.error(errorMsg);
    } finally {
      setIsCreatingUser(false);
    }
  }

  async function handleUpdateUser(userId: string) {
    if (!editData) return;

    try {
      const payload = {
        displayName: editData.displayName,
        role: editData.role,
        age: editData.age,
      };

      await apiClient.put(`/users/${userId}`, payload);
      toast.success('User updated successfully');
      
      setEditingUserId(null);
      setEditData(null);
      await loadUsers();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update user');
    }
  }

  async function handleDeleteUser(userId: string) {
    const user = users.find(u => u.id === userId);
    if (!confirm(`Are you sure you want to delete ${user?.displayName}? This action cannot be undone.`)) {
      return;
    }

    try {
      await apiClient.delete(`/users/${userId}`);
      toast.success(`${user?.displayName} has been removed`);
      await loadUsers();
    } catch (error: any) {
      const errorMsg = error?.response?.data?.error || error?.message || 'Failed to delete user';
      toast.error(errorMsg);
      console.error('Delete error:', error);
    }
  }

  async function handleResetPassword(userId: string) {
    if (!resetPasswordValue || resetPasswordValue.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    try {
      const user = users.find(u => u.id === userId);
      await apiClient.post(`/users/${userId}/reset-password`, {
        newPassword: resetPasswordValue,
      });
      toast.success(`Password reset for ${user?.displayName}`);
      setResettingPasswordUserId(null);
      setResetPasswordValue('');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to reset password');
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'adult':
        return 'bg-blue-100 text-blue-800';
      case 'teen':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-blue-600" />
          <h2 className="text-lg font-semibold text-slate-900">Family Users</h2>
        </div>
        {!isAddingUser && (
          <button
            onClick={() => setIsAddingUser(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Add User
          </button>
        )}
      </div>

      {/* Add User Form */}
      {isAddingUser && (
        <div className="bg-slate-50 rounded-xl p-4 mb-6 border border-slate-200">
          <form onSubmit={handleAddUser} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                required
              />
              <input
                type="password"
                placeholder="Password (min 8 chars)"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                required
              />
              <input
                type="text"
                placeholder="Display Name"
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <input
                type="number"
                placeholder="Age"
                min="5"
                max="100"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="teen">Teen</option>
                <option value="adult">Adult</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isCreatingUser}
                className={`flex-1 px-4 py-2 font-medium rounded-lg transition-colors text-sm ${
                  isCreatingUser
                    ? 'bg-slate-400 text-white cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isCreatingUser ? 'Creating...' : 'Create User'}
              </button>
              <button
                type="button"
                disabled={isCreatingUser}
                onClick={() => {
                  setIsAddingUser(false);
                  setFormData({
                    username: '',
                    password: '',
                    displayName: '',
                    role: 'teen',
                    age: '',
                  });
                }}
                className={`flex-1 px-4 py-2 font-medium rounded-lg transition-colors text-sm ${
                  isCreatingUser
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                }`}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users List */}
      {loading ? (
        <div className="text-center text-slate-500 py-8">
          <p>Loading users...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="text-center text-slate-500 py-8">
          <p>No users yet. Create one to get started!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {users.map((user) => (
            <div key={user.id} className="bg-slate-50 rounded-xl p-4 border border-slate-200 hover:border-slate-300 transition-colors">
              {editingUserId === user.id ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-slate-600">Display Name</label>
                      <input
                        type="text"
                        value={editData?.displayName || ''}
                        onChange={(e) => setEditData({ ...editData, displayName: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-600">Age</label>
                      <input
                        type="number"
                        min="5"
                        max="100"
                        value={editData?.age || ''}
                        onChange={(e) => setEditData({ ...editData, age: e.target.value ? parseInt(e.target.value, 10) : undefined })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm mt-1"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs font-medium text-slate-600">Role</label>
                      <select
                        value={editData?.role || ''}
                        onChange={(e) => setEditData({ ...editData, role: e.target.value as any })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm mt-1"
                      >
                        <option value="teen">Teen</option>
                        <option value="adult">Adult</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUpdateUser(user.id)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
                    >
                      <Check className="w-4 h-4" />
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditingUserId(null);
                        setEditData(null);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-300 text-slate-700 rounded-lg hover:bg-slate-400 transition-colors text-sm font-medium"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : resettingPasswordUserId === user.id ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-slate-600">New Password</label>
                    <input
                      type="password"
                      placeholder="Enter new password (min 8 characters)"
                      value={resetPasswordValue}
                      onChange={(e) => setResetPasswordValue(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm mt-1"
                      autoFocus
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleResetPassword(user.id)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium"
                    >
                      <Check className="w-4 h-4" />
                      Confirm
                    </button>
                    <button
                      onClick={() => {
                        setResettingPasswordUserId(null);
                        setResetPasswordValue('');
                      }}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-300 text-slate-700 rounded-lg hover:bg-slate-400 transition-colors text-sm font-medium"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium text-slate-900">{user.displayName}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                        {user.role}
                      </span>
                      {user.age && (
                        <span className="text-xs text-slate-600 bg-slate-200 px-2 py-1 rounded">
                          Age {user.age}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">@{user.username}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {user.role !== 'admin' && (
                      <button
                        onClick={() => setResettingPasswordUserId(user.id)}
                        className="p-2 text-orange-600 hover:bg-orange-100 rounded-lg transition-colors"
                        title="Reset password"
                      >
                        <Lock className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setEditingUserId(user.id);
                        setEditData({ ...user });
                      }}
                      className="p-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                      title="Edit user"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user.id)}
                      className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                      title="Delete user"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
