import { useEffect, useState } from 'react';
import { Shield, Plus, Trash2, X, Check } from 'lucide-react';
import { apiClient } from '@/api/client';
import { useToast } from '@/hooks/useToast';

interface User {
  id: string;
  displayName: string;
  role: string;
}

interface ParentalRule {
  id: string;
  ruleType: string;
  ruleValue: any;
  isActive: boolean;
  createdAt: string;
}

type RuleType = 'time_restriction' | 'daily_message_limit' | 'daily_token_budget' | 'keyword_block' | 'topic_block' | 'model_restriction' | 'ai_content_filter';

export function ParentalRules() {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [rules, setRules] = useState<ParentalRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingRule, setAddingRule] = useState(false);
  const [ruleType, setRuleType] = useState<RuleType>('time_restriction');
  const [ruleValue, setRuleValue] = useState('');
  const toast = useToast();

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (selectedUserId) {
      loadRules(selectedUserId);
    }
  }, [selectedUserId]);

  async function loadUsers() {
    try {
      const response = await apiClient.get('/users');
      setUsers(response.data);
    } catch (error) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }

  async function loadRules(userId: string) {
    try {
      setLoading(true);
      const response = await apiClient.get(`/users/${userId}/rules`);
      setRules(response.data);
    } catch (error) {
      toast.error('Failed to load rules');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddRule(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUserId || !ruleValue) {
      toast.error('Please fill all fields');
      return;
    }

    try {
      let parsedValue: any;
      switch (ruleType) {
        case 'time_restriction':
          const [start, end] = ruleValue.split(',').map((s: string) => parseInt(s.trim()));
          parsedValue = { start_hour: start, end_hour: end };
          break;
        case 'daily_message_limit':
        case 'daily_token_budget':
          parsedValue = { limit: parseInt(ruleValue) };
          break;
        case 'keyword_block':
        case 'topic_block':
          parsedValue = { list: ruleValue.split(',').map((s: string) => s.trim()) };
          break;
        case 'model_restriction':
          parsedValue = { allowed_models: [ruleValue] };
          break;
        case 'ai_content_filter':
          parsedValue = { enabled: true };
          break;
      }

      await apiClient.post(`/users/${selectedUserId}/rules`, {
        ruleType,
        ruleValue: parsedValue,
      });

      toast.success('Rule created successfully');
      setAddingRule(false);
      setRuleValue('');
      setRuleType('time_restriction');
      loadRules(selectedUserId);
    } catch (error) {
      toast.error('Failed to create rule');
    }
  }

  async function handleDeleteRule(ruleId: string) {
    if (!window.confirm('Delete this rule?')) return;

    try {
      await apiClient.delete(`/users/${selectedUserId}/rules/${ruleId}`);
      toast.success('Rule deleted');
      loadRules(selectedUserId);
    } catch (error) {
      toast.error('Failed to delete rule');
    }
  }

  const getRuleDescription = (rule: ParentalRule): string => {
    switch (rule.ruleType) {
      case 'time_restriction':
        return `Allowed between ${rule.ruleValue.start_hour}:00 and ${rule.ruleValue.end_hour}:00`;
      case 'daily_message_limit':
        return `Max ${rule.ruleValue.limit} messages per day`;
      case 'daily_token_budget':
        return `Max ${rule.ruleValue.limit} tokens per day`;
      case 'keyword_block':
        return `Blocks: ${rule.ruleValue.list?.join(', ') || 'none'}`;
      case 'topic_block':
        return `Blocked topics: ${rule.ruleValue.list?.join(', ') || 'none'}`;
      case 'model_restriction':
        return `Allowed models: ${rule.ruleValue.allowed_models?.join(', ') || 'none'}`;
      case 'ai_content_filter':
        return 'Content filtering enabled';
      default:
        return '';
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="w-5 h-5 text-blue-600" />
        <h2 className="text-lg font-semibold text-slate-900">Parental Rules</h2>
      </div>

      <div className="space-y-6">
        {/* User Selection */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Select User</label>
          <select
            value={selectedUserId}
            onChange={e => setSelectedUserId(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Choose a user...</option>
            {users.map(user => (
              <option key={user.id} value={user.id}>
                {user.displayName} ({user.role})
              </option>
            ))}
          </select>
        </div>

        {selectedUserId && (
          <>
            {/* Add Rule Form */}
            {!addingRule && (
              <button
                onClick={() => setAddingRule(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Rule
              </button>
            )}

            {addingRule && (
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <div className="mb-4">
                  <h3 className="font-medium text-slate-900 mb-3">Quick Access Controls</h3>
                  <div className="space-y-3 mb-4">
                    {/* Time Restriction Quick Add */}
                    <div className="bg-white p-3 rounded border border-slate-200 hover:border-blue-300 cursor-pointer" onClick={() => setRuleType('time_restriction')}>
                      <div className="text-sm font-medium text-slate-900">⏰ Set Access Hours</div>
                      <div className="text-xs text-slate-500">Restrict when the app can be used (e.g., 9 AM to 10 PM)</div>
                    </div>
                    {/* Daily Message Limit Quick Add */}
                    <div className="bg-white p-3 rounded border border-slate-200 hover:border-blue-300 cursor-pointer" onClick={() => setRuleType('daily_message_limit')}>
                      <div className="text-sm font-medium text-slate-900">💬 Daily Message Limit</div>
                      <div className="text-xs text-slate-500">Limit the number of messages per day</div>
                    </div>
                    {/* Daily Token Budget Quick Add */}
                    <div className="bg-white p-3 rounded border border-slate-200 hover:border-blue-300 cursor-pointer" onClick={() => setRuleType('daily_token_budget')}>
                      <div className="text-sm font-medium text-slate-900">⚡ Daily Usage Hours</div>
                      <div className="text-xs text-slate-500">Limit total tokens/computation time per day</div>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleAddRule} className="space-y-4 border-t border-slate-200 pt-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Rule Type</label>
                    <select
                      value={ruleType}
                      onChange={e => setRuleType(e.target.value as RuleType)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="time_restriction">Time Restriction (Access Hours)</option>
                      <option value="daily_message_limit">Daily Message Limit</option>
                      <option value="daily_token_budget">Daily Usage Budget</option>
                      <option value="keyword_block">Keyword Block</option>
                      <option value="topic_block">Topic Block</option>
                      <option value="model_restriction">Model Restriction</option>
                      <option value="ai_content_filter">Content Filter</option>
                    </select>
                  </div>

                  {ruleType !== 'ai_content_filter' && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        {ruleType === 'time_restriction'
                          ? 'Access Hours (24-hour format)'
                          : ruleType === 'keyword_block' || ruleType === 'topic_block'
                          ? 'List (comma-separated)'
                          : 'Value'}
                      </label>
                      <input
                        type={ruleType === 'daily_message_limit' || ruleType === 'daily_token_budget' ? 'number' : 'text'}
                        value={ruleValue}
                        onChange={e => setRuleValue(e.target.value)}
                        placeholder={
                          ruleType === 'time_restriction'
                            ? '9,22'
                            : ruleType === 'daily_message_limit'
                            ? '100'
                            : ruleType === 'keyword_block'
                            ? 'bad, word, another'
                            : ''
                        }
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                      {ruleType === 'time_restriction' && (
                        <p className="text-xs text-slate-500 mt-2">E.g., 9,22 allows access from 9 AM to 10 PM. Use 0-23 for hours.</p>
                      )}
                      {ruleType === 'daily_message_limit' && (
                        <p className="text-xs text-slate-500 mt-2">Maximum messages allowed per calendar day</p>
                      )}
                      {ruleType === 'daily_token_budget' && (
                        <p className="text-xs text-slate-500 mt-2">Maximum tokens (computation units) per day. ~4 tokens per message</p>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setAddingRule(false);
                        setRuleValue('');
                      }}
                      className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <Check className="w-4 h-4" />
                      Create
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Rules List */}
            <div>
              <h3 className="text-sm font-medium text-slate-700 mb-3">Active Rules</h3>
              {loading ? (
                <div className="animate-pulse space-y-2">
                  {[1, 2].map(i => (
                    <div key={i} className="h-12 bg-slate-200 rounded"></div>
                  ))}
                </div>
              ) : rules.length === 0 ? (
                <p className="text-sm text-slate-500 py-4">No rules configured for this user</p>
              ) : (
                <div className="space-y-2">
                  {rules.map(rule => (
                    <div
                      key={rule.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {rule.ruleType.replace('_', ' ')}
                        </p>
                        <p className="text-xs text-slate-500">{getRuleDescription(rule)}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteRule(rule.id)}
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
