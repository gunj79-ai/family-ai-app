import { useEffect, useState } from 'react';
import { LogIn, LogOut, MessageCircle, AlertTriangle, Upload, Settings, Trash2 } from 'lucide-react';
import { apiClient } from '@/api/client';
import { useToast } from '@/hooks/useToast';

interface ActivityItem {
  id: string;
  userId: string | null;
  userName: string | null;
  eventType: string;
  eventData: any;
  ipAddress: string | null;
  createdAt: string;
}

const eventTypeIcons: Record<string, any> = {
  login: LogIn,
  logout: LogOut,
  message_sent: MessageCircle,
  message_blocked: AlertTriangle,
  file_uploaded: Upload,
  settings_changed: Settings,
  chat_created: MessageCircle,
  user_deleted: Trash2,
};

const eventTypeColors: Record<string, string> = {
  login: 'text-green-600',
  logout: 'text-blue-600',
  message_sent: 'text-slate-600',
  message_blocked: 'text-red-600',
  file_uploaded: 'text-purple-600',
  settings_changed: 'text-orange-600',
  chat_created: 'text-blue-600',
  user_deleted: 'text-red-600',
};

export function ActivityLog() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const toast = useToast();

  useEffect(() => {
    loadActivities();
  }, [filter]);

  async function loadActivities() {
    try {
      setLoading(true);
      const params = filter ? { eventType: filter } : {};
      const response = await apiClient.get('/admin/activity', { params });
      setActivities(response.data);
    } catch (error) {
      toast.error('Failed to load activity log');
    } finally {
      setLoading(false);
    }
  }

  const eventTypes = [
    'login',
    'logout',
    'chat_created',
    'message_sent',
    'message_blocked',
    'file_uploaded',
    'settings_changed',
  ];

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="animate-pulse space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-12 bg-slate-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Activity Log</h2>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilter('')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === ''
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Events
          </button>
          {eventTypes.map(type => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === type
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {type.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {activities.length === 0 ? (
        <div className="py-12 text-center text-slate-500">
          <p>No activities found</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {activities.map(activity => {
            const Icon = eventTypeIcons[activity.eventType] || MessageCircle;
            const colorClass = eventTypeColors[activity.eventType] || 'text-slate-600';
            const time = new Date(activity.createdAt);
            const isToday = new Date().toDateString() === time.toDateString();
            const timeStr = isToday
              ? time.toLocaleTimeString()
              : time.toLocaleDateString() + ' ' + time.toLocaleTimeString();

            return (
              <div
                key={activity.id}
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${colorClass}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="font-medium text-slate-900">
                      {activity.eventType.replace('_', ' ')}
                    </span>
                    {activity.userName && (
                      <span className="text-sm text-slate-500">by {activity.userName}</span>
                    )}
                  </div>
                  {activity.eventData && Object.keys(activity.eventData).length > 0 && (
                    <p className="text-sm text-slate-600">
                      {JSON.stringify(activity.eventData).substring(0, 100)}
                      {JSON.stringify(activity.eventData).length > 100 ? '...' : ''}
                    </p>
                  )}
                  <p className="text-xs text-slate-400 mt-1">{timeStr}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
