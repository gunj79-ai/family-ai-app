import { useEffect, useState } from 'react';
import { Users, MessageSquare, AlertCircle, TrendingUp } from 'lucide-react';
import { apiClient } from '@/api/client';
import { useToast } from '@/hooks/useToast';

interface AdminStats {
  totalUsers: number;
  totalChats: number;
  totalMessages: number;
  flaggedToday: number;
  usageByUser: Array<{
    userId: string;
    displayName: string;
    role: string;
    messagesTotal: number;
    messagesToday: number;
    chatsTotal: number;
  }>;
  messagesLast7Days: Array<{
    date: string;
    count: number;
  }>;
}

export function StatsPanel() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      setLoading(true);
      const response = await apiClient.get('/admin/stats');
      setStats(response.data);
    } catch (error) {
      toast.error('Failed to load stats');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-200 rounded w-1/3"></div>
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-slate-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const statCards = [
    {
      label: 'Total Users',
      value: stats.totalUsers,
      icon: Users,
      color: 'bg-blue-100 text-blue-600',
    },
    {
      label: 'Total Chats',
      value: stats.totalChats,
      icon: MessageSquare,
      color: 'bg-green-100 text-green-600',
    },
    {
      label: 'Total Messages',
      value: stats.totalMessages,
      icon: TrendingUp,
      color: 'bg-purple-100 text-purple-600',
    },
    {
      label: 'Flagged Today',
      value: stats.flaggedToday,
      icon: AlertCircle,
      color: 'bg-red-100 text-red-600',
    },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        {statCards.map(card => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-white rounded-xl border border-slate-200 p-4 hover:border-slate-300 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-sm font-medium text-slate-600">{card.label}</h3>
                <div className={`p-2 rounded-lg ${card.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
                <p className="text-2xl font-bold text-slate-900">{card.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Usage by User Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">User Activity</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 font-medium text-slate-600">Name</th>
                <th className="text-left py-3 px-4 font-medium text-slate-600">Role</th>
                <th className="text-center py-3 px-4 font-medium text-slate-600">Chats</th>
                <th className="text-center py-3 px-4 font-medium text-slate-600">Messages (Total)</th>
                <th className="text-center py-3 px-4 font-medium text-slate-600">Messages (Today)</th>
              </tr>
            </thead>
            <tbody>
              {stats.usageByUser.map(user => (
                <tr key={user.userId} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4">{user.displayName}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      user.role === 'admin'
                        ? 'bg-red-100 text-red-700'
                        : user.role === 'adult'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-purple-100 text-purple-700'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="text-center py-3 px-4 font-medium">{user.chatsTotal}</td>
                  <td className="text-center py-3 px-4 font-medium">{user.messagesTotal}</td>
                  <td className="text-center py-3 px-4 font-medium text-green-600">{user.messagesToday}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Messages Last 7 Days Chart */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Messages (Last 7 Days)</h3>
        <div className="space-y-2">
          {stats.messagesLast7Days.map(day => {
            const maxCount = Math.max(...stats.messagesLast7Days.map(d => d.count), 1);
            const percentage = (day.count / maxCount) * 100;
            return (
              <div key={day.date}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600">{new Date(day.date + 'T00:00:00').toLocaleDateString()}</span>
                  <span className="font-medium text-slate-900">{day.count}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-blue-600 h-full rounded-full transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
