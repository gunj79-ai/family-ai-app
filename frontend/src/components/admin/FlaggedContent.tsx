import { useEffect, useState } from 'react';
import { AlertTriangle, Check, X } from 'lucide-react';
import { apiClient } from '@/api/client';
import { useToast } from '@/hooks/useToast';

interface FlaggedItem {
  id: string;
  userId: string | null;
  userName: string | null;
  chatId: string | null;
  chatTitle: string | null;
  messageId: string | null;
  flagType: 'keyword' | 'ai_classifier' | 'manual';
  flagReason: string;
  originalContent: string;
  isReviewed: boolean;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

export function FlaggedContent() {
  const [flagged, setFlagged] = useState<FlaggedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReviewed, setShowReviewed] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    loadFlagged();
  }, [showReviewed]);

  async function loadFlagged() {
    try {
      setLoading(true);
      const response = await apiClient.get('/admin/flagged', {
        params: { reviewed: showReviewed ? 'true' : 'false' },
      });
      setFlagged(response.data);
    } catch (error) {
      toast.error('Failed to load flagged content');
    } finally {
      setLoading(false);
    }
  }

  async function handleReview(id: string) {
    try {
      setReviewingId(id);
      await apiClient.put(`/admin/flagged/${id}/review`);
      toast.success('Content marked as reviewed');
      loadFlagged();
    } catch (error) {
      toast.error('Failed to review content');
    } finally {
      setReviewingId(null);
    }
  }

  const flagTypeColors: Record<string, string> = {
    keyword: 'bg-yellow-100 text-yellow-700',
    ai_classifier: 'bg-orange-100 text-orange-700',
    manual: 'bg-red-100 text-red-700',
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-slate-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
          Flagged Content
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowReviewed(false)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              !showReviewed
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Pending ({flagged.length})
          </button>
          <button
            onClick={() => setShowReviewed(true)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              showReviewed
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Reviewed
          </button>
        </div>
      </div>

      {flagged.length === 0 ? (
        <div className="py-12 text-center text-slate-500">
          <p>
            {showReviewed
              ? 'No reviewed content'
              : 'No flagged content pending review'}
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {flagged.map(item => (
            <div
              key={item.id}
              className="border border-slate-200 rounded-lg p-4 hover:border-slate-300 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${flagTypeColors[item.flagType]}`}>
                      {item.flagType.replace('_', ' ')}
                    </span>
                    {item.userName && (
                      <span className="text-sm font-medium text-slate-900">{item.userName}</span>
                    )}
                  </div>
                  {item.chatTitle && (
                    <p className="text-sm text-slate-600">Chat: {item.chatTitle}</p>
                  )}
                </div>
                {!item.isReviewed && (
                  <button
                    onClick={() => handleReview(item.id)}
                    disabled={reviewingId === item.id}
                    className="p-2 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Mark as reviewed"
                  >
                    <Check className="w-5 h-5 text-green-600" />
                  </button>
                )}
              </div>

              <div className="mb-3">
                <p className="text-sm font-medium text-slate-700 mb-1">Reason:</p>
                <p className="text-sm text-slate-600">{item.flagReason}</p>
              </div>

              <div className="bg-slate-50 rounded-lg p-3 mb-3">
                <p className="text-sm font-medium text-slate-700 mb-1">Content:</p>
                <p className="text-sm text-slate-600 line-clamp-3">{item.originalContent}</p>
              </div>

              <div className="flex justify-between text-xs text-slate-400">
                <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                {item.isReviewed && (
                  <span>Reviewed by {item.reviewedBy || 'Unknown'}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
