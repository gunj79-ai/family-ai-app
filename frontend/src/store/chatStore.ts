import { create } from 'zustand';
import type { Chat, Message } from '@/types';

interface PendingAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  previewUrl?: string;
}

interface ChatState {
  activeChat: Chat | null;
  messages: Message[];
  isStreaming: boolean;
  streamingContent: string;
  streamingMessageId: string | null;
  pendingAttachments: PendingAttachment[];
  setActiveChat: (chat: Chat | null) => void;
  setMessages: (messages: Message[]) => void;
  appendMessage: (message: Message) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  startStreaming: (messageId: string) => void;
  appendChunk: (chunk: string) => void;
  finalizeStream: (message: Message) => void;
  abortStream: () => void;
  addAttachment: (att: PendingAttachment) => void;
  removeAttachment: (id: string) => void;
  clearAttachments: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  activeChat: null,
  messages: [],
  isStreaming: false,
  streamingContent: '',
  streamingMessageId: null,
  pendingAttachments: [],

  setActiveChat: (chat) => set({
    activeChat: chat,
    messages: [],
    streamingContent: '',
    streamingMessageId: null,
  }),
  setMessages:   (messages) => set({ messages }),
  appendMessage: (message)  => set((s) => ({ messages: [...s.messages, message] })),
  updateMessage: (id, updates) => set((s) => ({
    messages: s.messages.map((m) => m.id === id ? { ...m, ...updates } : m),
  })),
  startStreaming: (messageId) => set({
    isStreaming: true,
    streamingContent: '',
    streamingMessageId: messageId,
  }),
  appendChunk: (chunk) => set((s) => ({
    streamingContent: s.streamingContent + chunk,
  })),
  finalizeStream: (message) => set((s) => ({
    messages: [...s.messages.filter((m) => m.id !== message.id), message],
    isStreaming: false,
    streamingContent: '',
    streamingMessageId: null,
  })),
  abortStream: () => set({
    isStreaming: false,
    streamingContent: '',
    streamingMessageId: null,
  }),
  addAttachment:    (att) => set((s) => ({
    pendingAttachments: [...s.pendingAttachments, att],
  })),
  removeAttachment: (id)  => set((s) => ({
    pendingAttachments: s.pendingAttachments.filter((a) => a.id !== id),
  })),
  clearAttachments: ()    => set({ pendingAttachments: [] }),
}));
