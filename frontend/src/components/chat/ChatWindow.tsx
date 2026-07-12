import { useEffect, useRef, useMemo } from 'react';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { useChatStore } from '@/store/chatStore';
import { useAuthStore } from '@/store/authStore';
import { getRandomDadJoke } from '@/data/dadJokes';
import { useChat } from '@/hooks/useChat';
import type { Chat } from '@/types';

interface Props {
  chat: Chat;
}

export function ChatWindow({ chat }: Props) {
  const { user } = useAuthStore();
  const { messages, isStreaming, streamingContent } = useChatStore();
  const { sendMessage } = useChat();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [parent] = useAutoAnimate({ duration: 150 });

  const joke = useMemo(() => getRandomDadJoke(), [chat.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, streamingContent]);

  async function handleSend(content: string, attachmentIds: string[]) {
    await sendMessage({ chatId: chat.id, content, attachmentIds });
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-white via-slate-50/30 to-blue-50/10">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-3 sm:px-4 py-4 sm:py-8 max-w-3xl mx-auto w-full" ref={parent}>
        {messages.length === 0 && !isStreaming ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center mb-6 shadow-lg shadow-blue-500/10">
              <span className="text-3xl font-bold text-blue-600">F</span>
            </div>
            <h2 className="text-2xl font-semibold text-slate-800 mb-3">
              Hi, {user?.displayName}!
            </h2>
            <p className="italic text-gray-400 text-sm max-w-[280px] text-center mx-auto">{joke}</p>
          </div>
        ) : (
          <>
            {messages
              .filter(m => m.role !== 'system')
              .map(m => (
                <MessageBubble key={m.id} message={m} />
              ))}

            {isStreaming && (
              <MessageBubble
                message={{
                  id: 'streaming',
                  chatId: chat.id,
                  role: 'assistant',
                  content: '',
                  isFlagged: false,
                  createdAt: new Date().toISOString(),
                }}
                isStreaming
                streamingContent={streamingContent}
              />
            )}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <MessageInput chatId={chat.id} onSend={handleSend} />
    </div>
  );
}
