import { apiClient } from './client';
import type { AdminStats, ActivityLog, FlaggedContent, User, UserSettings, ParentalRule } from '@/types';

export const adminApi = {
  stats:         () =>
    apiClient.get<AdminStats>('/admin/stats').then(r => r.data),
  activity:      (params?: { userId?: string; eventType?: string; limit?: number }) =>
    apiClient.get<ActivityLog[]>('/admin/activity', { params }).then(r => r.data),
  flagged:       (params?: { reviewed?: boolean; limit?: number }) =>
    apiClient.get<FlaggedContent[]>('/admin/flagged', { params }).then(r => r.data),
  reviewFlagged: (id: string) =>
    apiClient.put(`/admin/flagged/${id}/review`).then(r => r.data),
  getSettings:   () =>
    apiClient.get<Record<string, string>>('/admin/settings').then(r => r.data),
  updateSettings:(data: Record<string, string>) =>
    apiClient.put<Record<string, string>>('/admin/settings', data).then(r => r.data),
  // User management
  listUsers:     () =>
    apiClient.get<User[]>('/users').then(r => r.data),
  createUser:    (data: { username: string; password: string; displayName: string; role: string }) =>
    apiClient.post<User>('/users', data).then(r => r.data),
  updateUser:    (id: string, data: Partial<User>) =>
    apiClient.put<User>(`/users/${id}`, data).then(r => r.data),
  getUserRules:  (id: string) =>
    apiClient.get<ParentalRule[]>(`/users/${id}/rules`).then(r => r.data),
  createRule:    (userId: string, data: { ruleType: string; ruleValue: object }) =>
    apiClient.post<ParentalRule>(`/users/${userId}/rules`, data).then(r => r.data),
  updateRule:    (userId: string, ruleId: string, data: object) =>
    apiClient.put<ParentalRule>(`/users/${userId}/rules/${ruleId}`, data).then(r => r.data),
  deleteRule:    (userId: string, ruleId: string) =>
    apiClient.delete(`/users/${userId}/rules/${ruleId}`).then(r => r.data),
};
