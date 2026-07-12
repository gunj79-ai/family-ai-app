import React from 'react';
import { AlertCircle, Info } from 'lucide-react';

interface ContextBarProps {
  /** Current token count in this chat */
  currentTokens: number;
  
  /** Total token budget for the day (or session) */
  maxTokens?: number;
  
  /** Whether to show the full context info */
  isExpanded?: boolean;
  
  /** Additional context info to display */
  contextInfo?: {
    systemInstructions?: number;
    projectContext?: number;
    chatHistory?: number;
    attachments?: number;
  };
}

export function ContextBar({
  currentTokens,
  maxTokens = 100000,
  isExpanded = false,
  contextInfo,
}: ContextBarProps) {
  const percentage = (currentTokens / maxTokens) * 100;
  const remaining = maxTokens - currentTokens;
  const isLow = percentage > 80;
  const isCritical = percentage > 95;

  const getColor = () => {
    if (isCritical) return 'bg-red-500';
    if (isLow) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const getTextColor = () => {
    if (isCritical) return 'text-red-700';
    if (isLow) return 'text-amber-700';
    return 'text-emerald-700';
  };

  const getBgColor = () => {
    if (isCritical) return 'bg-red-50';
    if (isLow) return 'bg-amber-50';
    return 'bg-emerald-50';
  };

  const formatTokens = (num: number) => {
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toLocaleString();
  };

  return (
    <div className={`px-4 py-3 rounded-lg border ${getBgColor()} border-current`}>
      {/* Main Bar */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {isCritical ? (
            <AlertCircle className={`w-4 h-4 ${getTextColor()}`} />
          ) : isLow ? (
            <AlertCircle className={`w-4 h-4 ${getTextColor()}`} />
          ) : (
            <Info className={`w-4 h-4 ${getTextColor()}`} />
          )}
          <span className={`text-sm font-medium ${getTextColor()}`}>
            Context: {formatTokens(currentTokens)} / {formatTokens(maxTokens)} tokens
          </span>
        </div>
        <span className={`text-xs font-medium ${getTextColor()}`}>
          {Math.round(percentage)}%
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden mb-2">
        <div
          className={`h-2 transition-all duration-300 ${getColor()}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>

      {/* Status Message */}
      <p className={`text-xs font-medium ${getTextColor()}`}>
        {isCritical && '⚠️ Critical: Token budget nearly exhausted'}
        {isLow && !isCritical && '⚠️ Warning: 80% of token budget used'}
        {!isLow && '✓ Healthy context usage'}
      </p>

      {/* Expanded Info */}
      {isExpanded && contextInfo && (
        <div className="mt-3 pt-3 border-t border-current/10 space-y-1 text-xs">
          {contextInfo.systemInstructions !== undefined && (
            <div className="flex justify-between">
              <span className="text-gray-600">System instructions:</span>
              <span className="font-medium">
                {formatTokens(contextInfo.systemInstructions)}
              </span>
            </div>
          )}
          {contextInfo.projectContext !== undefined && (
            <div className="flex justify-between">
              <span className="text-gray-600">Project context:</span>
              <span className="font-medium">
                {formatTokens(contextInfo.projectContext)}
              </span>
            </div>
          )}
          {contextInfo.chatHistory !== undefined && (
            <div className="flex justify-between">
              <span className="text-gray-600">Chat history:</span>
              <span className="font-medium">
                {formatTokens(contextInfo.chatHistory)}
              </span>
            </div>
          )}
          {contextInfo.attachments !== undefined && (
            <div className="flex justify-between">
              <span className="text-gray-600">Attachments:</span>
              <span className="font-medium">
                {formatTokens(contextInfo.attachments)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Remaining Info */}
      <p className="text-xs text-gray-600 mt-2">
        {remaining > 0
          ? `${formatTokens(remaining)} tokens remaining`
          : 'Token budget exhausted'}
      </p>
    </div>
  );
}
