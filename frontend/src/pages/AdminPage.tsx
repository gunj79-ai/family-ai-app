import { useState } from 'react';
import { BarChart3, Users, Activity, AlertTriangle, Shield, Settings } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { StatsPanel } from '@/components/admin/StatsPanel';
import { ActivityLog } from '@/components/admin/ActivityLog';
import { FlaggedContent } from '@/components/admin/FlaggedContent';
import { ParentalRules } from '@/components/admin/ParentalRules';
import { UserManagement } from '@/components/admin/UserManagement';
import { AdminSettings } from '@/components/admin/AdminSettings';

type TabType = 'overview' | 'users' | 'activity' | 'flagged' | 'rules' | 'app';

export function AdminPage() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  const tabs = [
    {
      id: 'overview' as TabType,
      label: 'Overview',
      icon: BarChart3,
    },
    {
      id: 'users' as TabType,
      label: 'Users',
      icon: Users,
    },
    {
      id: 'activity' as TabType,
      label: 'Activity',
      icon: Activity,
    },
    {
      id: 'flagged' as TabType,
      label: 'Flagged',
      icon: AlertTriangle,
    },
    {
      id: 'rules' as TabType,
      label: 'Rules',
      icon: Shield,
    },
    {
      id: 'app' as TabType,
      label: 'App Settings',
      icon: Settings,
    },
  ];

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto p-8 pb-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-blue-600" />
            Admin Dashboard
          </h1>
          <p className="text-slate-600 mt-2">Manage users, monitor activity, and set parental controls</p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8 border-b border-slate-200 overflow-x-auto scrollbar-thin -mb-px">
          <div className="flex gap-2 whitespace-nowrap">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 font-medium text-sm transition-colors border-b-2 min-w-max ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'overview' && <StatsPanel />}
          {activeTab === 'users' && <UserManagement />}
          {activeTab === 'activity' && <ActivityLog />}
          {activeTab === 'flagged' && <FlaggedContent />}
          {activeTab === 'rules' && <ParentalRules />}
          {activeTab === 'app' && <AdminSettings />}
        </div>
      </div>
    </AppShell>
  );
}
