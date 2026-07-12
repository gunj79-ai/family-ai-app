import { useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChatStore } from '@/store/chatStore';
import { useAuthStore } from '@/store/authStore';
import { chatsApi } from '@/api/chats';
import type { Chat, Message } from '@/types';

interface SendOptions {
  chatId: string;
  content: string;
  attachmentIds?: string[];
}

export function useChat() {
  const navigate = useNavigate();
  const { token } = useAuthStore();
  const {
    appendMessage, startStreaming, appendChunk,
    finalizeStream, abortStream, clearAttachments,
    setMessages, setActiveChat,
  } = useChatStore();
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async ({ chatId, content, attachmentIds = [] }: SendOptions) => {
    // Optimistic user message
    const tempId = `temp-${Date.now()}`;
    const tempMsg: Message = {
      id: tempId,
      chatId,
      role: 'user',
      content,
      isFlagged: false,
      createdAt: new Date().toISOString(),
    };
    appendMessage(tempMsg);
    clearAttachments();

    const assistantTempId = `streaming-${Date.now()}`;
    startStreaming(assistantTempId);

    abortRef.current = new AbortController();
    let accumulatedContent = ''; // Track streamed content locally

    try {
      const response = await fetch(`/api/chats/${chatId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content, attachmentIds }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(err.error || `HTTP ${response.status}`);
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let assistantMessageId = '';
      let tokenCount = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const raw = decoder.decode(value, { stream: true });
        const lines = raw.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const json = line.slice(6).trim();
          if (!json || json === '[DONE]') continue;

          try {
            const event = JSON.parse(json) as {
              type: 'chunk' | 'done' | 'error';
              content?: string;
              messageId?: string;
              tokenCount?: number;
              error?: string;
            };

            if (event.type === 'chunk' && event.content) {
              accumulatedContent += event.content;
              appendChunk(event.content);
            }

            if (event.type === 'done') {
              assistantMessageId = event.messageId || '';
              tokenCount = event.tokenCount || 0;
              
              // Create the final assistant message with all streamed content
              const assistantMsg: Message = {
                id: assistantMessageId,
                chatId,
                role: 'assistant',
                content: accumulatedContent, // Use accumulated content
                isFlagged: false,
                tokenCount,
                createdAt: new Date().toISOString(),
              };
              
              // Finalize streaming - adds the complete message to the store
              finalizeStream(assistantMsg);
            }

            if (event.type === 'error') {
              throw new Error(event.error || 'Streaming error');
            }
          } catch (parseErr) {
            if (parseErr instanceof SyntaxError) continue;
            throw parseErr;
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        abortStream();
        return;
      }
      abortStream();
      throw err;
    }
  }, [token, appendMessage, clearAttachments, startStreaming, appendChunk, finalizeStream, abortStream]);

  const createChat = useCallback(async (projectId?: string, model?: string) => {
    const chat = await chatsApi.create({
      projectId,
      model: model || 'claude-haiku-4-5-20251001',
    });
    return chat;
  }, []);

  const loadChat = useCallback(async (chat: Chat) => {
    setActiveChat(chat);
    const messages = await chatsApi.messages(chat.id, { limit: 100 });
    setMessages(messages);
  }, [setActiveChat, setMessages]);

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { sendMessage, createChat, loadChat, stopStreaming };
}
