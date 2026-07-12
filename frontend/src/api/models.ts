import { apiClient } from './client';
import type { AIModel } from '@/types';

export const modelsApi = {
  list: () => apiClient.get<AIModel[]>('/models').then(r => r.data),
};
