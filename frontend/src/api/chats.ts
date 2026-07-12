import { apiClient } from './client';
import type { Chat, Message, CreateChatRequest } from '@/types';

export const chatsApi = {
  list:     (params?: { projectId?: string; search?: string; pinned?: boolean }) =>
    apiClient.get<Chat[]>('/chats', { params }).then(r => r.data),
  get:      (id: string) =>
    apiClient.get<Chat>(`/chats/${id}`).then(r => r.data),
  create:   (data: CreateChatRequest) =>
    apiClient.post<Chat>('/chats', data).then(r => r.data),
  update:   (id: string, data: Partial<Chat>) =>
    apiClient.put<Chat>(`/chats/${id}`, data).then(r => r.data),
  delete:   (id: string) =>
    apiClient.delete(`/chats/${id}`).then(r => r.data),
  messages: (chatId: string, params?: { limit?: number; offset?: number }) =>
    apiClient.get<Message[]>(`/chats/${chatId}/messages`, { params }).then(r => r.data),
  export:   (chatId: string) =>
    apiClient.get(`/chats/${chatId}/export`, { responseType: 'blob' }).then(r => r.data),
};
