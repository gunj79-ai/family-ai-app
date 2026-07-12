import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { useChatStore } from '@/store/chatStore';
import { useChats } from '@/hooks/useProjects';
import { useChat } from '@/hooks/useChat';
import type { Chat } from '@/types';

export function ChatPage() {
  const navigate = useNavigate();
  const { chatId } = useParams<{ chatId?: string }>();
  const { activeChat, setActiveChat } = useChatStore();
  const { chats } = useChats();
  const { loadChat, createChat } = useChat();

  useEffect(() => {
    async function init() {
      if (chatId) {
        const found = chats.find((c: Chat) => c.id === chatId);
        if (found && found.id !== activeChat?.id) {
          await loadChat(found);
        }
      } else if (chats.length > 0 && !activeChat) {
        await loadChat(chats[0]);
        navigate(`/chat/${chats[0].id}`, { replace: true });
      }
    }
    init();
  }, [chatId, chats, activeChat, loadChat, navigate]);

  return (
    <AppShell>
      {activeChat ? (
        <ChatWindow chat={activeChat} />
      ) : (
        <div className="flex flex-col items-center justify-center h-full text-center px-6">
          <div className="w-14 h-14 rounded-2xl bg-primary-100 flex items-center justify-center mb-4">
            <span className="text-2xl font-bold text-primary-600">F</span>
          </div>
          <h2 className="text-lg font-medium text-gray-700 mb-2">Welcome to Eva</h2>
          <p className="text-sm text-gray-400 mb-6">Your private family AI assistant</p>
          <button
            onClick={async () => {
              const chat = await createChat();
              setActiveChat(chat);
              navigate(`/chat/${chat.id}`);
            }}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg text-sm hover:bg-primary-600 transition-colors"
          >
            Start a conversation
          </button>
        </div>
      )}
    </AppShell>
  );
}
