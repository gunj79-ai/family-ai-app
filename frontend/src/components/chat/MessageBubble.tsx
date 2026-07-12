import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check, AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';
import { timeOnly } from '@/utils/dates';
import { formatTokens } from '@/utils/tokens';
import { EvaAvatar } from '@/components/eva/EvaAvatar';
import type { Message } from '@/types';

interface Props {
  message: Message;
  isStreaming?: boolean;
  streamingContent?: string;
}

export function MessageBubble({ message, isStreaming, streamingContent }: Props) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';
  const content = isStreaming ? streamingContent ?? '' : message.content;

  function copyContent() {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (isUser) {
    return (
      <motion.div 
        className="flex justify-end mb-6 group"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
        <div className="max-w-[85%] sm:max-w-[75%]">
          <div className="bg-blue-600 text-white rounded-[18px] rounded-br-[4px] px-5 py-3 text-[15px] leading-[1.65] whitespace-pre-wrap shadow-lg shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 transition-shadow">
            {content}
          </div>
          <div className="text-right mt-2">
            <span className="text-xs text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
              {timeOnly(message.createdAt)}
            </span>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      className="flex gap-4 mb-8 group"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white flex items-center justify-center mt-0.5 shadow-sm border border-slate-200">
        <EvaAvatar size={32} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="prose prose-sm max-w-none text-slate-900 leading-relaxed">
          {isStreaming ? (
            <span>
              {content}
              <span className="inline-block w-0.5 h-4 bg-primary-500 ml-0.5 animate-pulse align-text-bottom" />
            </span>
          ) : (
            <ReactMarkdown
              components={{
                code({ node, className, children, ...props }: any) {
                  const match = /language-(\w+)/.exec(className || '');
                  const inline = !match;
                  return !inline ? (
                    <SyntaxHighlighter
                      style={oneLight as Record<string, React.CSSProperties>}
                      language={match?.[1] || 'text'}
                      PreTag="div"
                      className="rounded-xl text-xs shadow-sm bg-slate-50 border border-slate-200"
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  ) : (
                    <code className="bg-slate-100 text-slate-800 px-2 py-1 rounded-md text-xs font-mono border border-slate-200" {...props}>
                      {children}
                    </code>
                  );
                },
                p: ({ children }: any) => <p className="mb-4 last:mb-0 leading-7">{children}</p>,
                ul: ({ children }: any) => <ul className="list-disc list-inside pl-2 mb-4 space-y-1.5">{children}</ul>,
                ol: ({ children }: any) => <ol className="list-decimal list-inside pl-2 mb-4 space-y-1.5">{children}</ol>,
                li: ({ children }: any) => <li className="text-slate-800">{children}</li>,
                h1: ({ children }: any) => <h1 className="text-xl font-bold mb-3 mt-4 text-slate-900">{children}</h1>,
                h2: ({ children }: any) => <h2 className="text-lg font-bold mb-3 mt-4 text-slate-900">{children}</h2>,
                h3: ({ children }: any) => <h3 className="text-base font-bold mb-2 mt-3 text-slate-900">{children}</h3>,
                blockquote: ({ children }: any) => <blockquote className="border-l-4 border-blue-400 pl-4 py-2 mb-3 bg-blue-50/50 rounded-r text-slate-700">{children}</blockquote>,
              }}
            >
              {content}
            </ReactMarkdown>
          )}
        </div>

        {!isStreaming && (
          <div className="flex items-center gap-3 mt-3 pt-2 border-t border-slate-100">
            {message.tokenCount ? (
              <span className="text-xs text-slate-500 font-medium">
                💬 {formatTokens(message.tokenCount)}
              </span>
            ) : null}
            {message.isFlagged && (
              <span className="flex items-center gap-1.5 text-xs text-amber-600 font-medium bg-amber-50/50 px-2 py-0.5 rounded-md">
                <AlertTriangle className="w-3 h-3" /> Flagged
              </span>
            )}
            <button
              onClick={copyContent}
              className={cn(
                'flex items-center gap-1.5 text-xs font-medium opacity-0 group-hover:opacity-100',
                'text-slate-500 hover:text-slate-700 transition-all ml-auto',
                'hover:bg-slate-100/50 px-2 py-1 rounded-md'
              )}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-600">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
