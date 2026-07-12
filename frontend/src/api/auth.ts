import { apiClient } from './client';
import type { LoginRequest, LoginResponse, User, UserSettings } from '@/types';

export const authApi = {
  login: (data: LoginRequest) =>
    apiClient.post<LoginResponse>('/auth/login', data).then(r => r.data),
  logout: () =>
    apiClient.post('/auth/logout').then(r => r.data),
  me: () =>
    apiClient.get<{ user: User; settings: UserSettings }>('/auth/me').then(r => r.data),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    apiClient.put('/auth/password', data).then(r => r.data),
};
