import { useState, useEffect } from 'react';
import { X, Copy, Check, RotateCcw } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useToast } from '@/hooks/useToast';
import { apiClient } from '@/api/client';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function EvaSettings({ isOpen, onClose }: Props) {
  const [evaInstructions, setEvaInstructions] = useState('');
  const [defaultInstructions, setDefaultInstructions] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const { success, error } = useToast();

  // Load Eva settings
  useEffect(() => {
    if (!isOpen) return;

    async function loadSettings() {
      try {
        setLoading(true);
        const [currentRes, defaultRes] = await Promise.all([
          apiClient.get('/eva/settings'),
          apiClient.get('/eva/default'),
        ]);

        setEvaInstructions(currentRes.data.evaInstructions);
        setDefaultInstructions(defaultRes.data.defaultCharacter);
        setIsEditing(currentRes.data.isCustomized);
      } catch (err) {
        console.error('Failed to load Eva settings:', err);
        error('Failed to load Eva settings');
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, [isOpen, error]);

  async function handleSave() {
    if (!evaInstructions.trim()) {
      error('Eva instructions cannot be empty');
      return;
    }

    try {
      setSaving(true);
      await apiClient.put('/eva/settings', {
        evaInstructions: evaInstructions.trim(),
      });
      success('Eva\'s character has been updated');
      setIsEditing(true);
    } catch (err: any) {
      console.error('Failed to save Eva settings:', err);
      error(err.response?.data?.error || 'Failed to save Eva settings');
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setEvaInstructions(defaultInstructions);
    setIsEditing(false);
  }

  function handleCopy() {
    navigator.clipboard.writeText(evaInstructions);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Eva's Character</h2>
            <p className="text-sm text-slate-500 mt-1">Customize Eva's personality and guidelines</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              {/* Instructions Textarea */}
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Eva's Instructions
                </label>
                <textarea
                  value={evaInstructions}
                  onChange={(e) => {
                    setEvaInstructions(e.target.value);
                    setIsEditing(e.target.value !== defaultInstructions);
                  }}
                  rows={12}
                  className={cn(
                    'w-full resize-none rounded-2xl border px-4 py-3 text-sm font-mono',
                    'bg-slate-50 border-slate-200 hover:border-slate-300',
                    'focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400',
                    'focus:bg-white transition-all duration-200'
                  )}
                  placeholder="Enter Eva's character instructions..."
                />
                <p className="text-xs text-slate-500 mt-2">
                  {evaInstructions.length} characters
                  {evaInstructions.length < 100 && ' (minimum 100 required)'}
                </p>
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-xs text-slate-700">
                  <strong>Tip:</strong> Use variables like <code className="bg-blue-100 px-1.5 py-0.5 rounded text-xs font-mono">{'{{user_name}}'}</code>, <code className="bg-blue-100 px-1.5 py-0.5 rounded text-xs font-mono">{'{{current_date}}'}</code>, and <code className="bg-blue-100 px-1.5 py-0.5 rounded text-xs font-mono">{'{{guardian_name}}'}</code> for dynamic content.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!loading && (
          <div className="border-t border-slate-200 p-6 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className={cn(
                  'flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg',
                  'transition-all duration-200',
                  copied
                    ? 'text-emerald-600 bg-emerald-50'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                )}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy
                  </>
                )}
              </button>

              {isEditing && (
                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all duration-200"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Close
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !isEditing}
                className={cn(
                  'px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200',
                  isEditing && !saving
                    ? 'text-white bg-blue-600 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/30'
                    : 'text-slate-400 bg-slate-100 cursor-not-allowed'
                )}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
