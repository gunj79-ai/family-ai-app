import { apiClient } from './client';
import type { Project, ProjectFile, CreateProjectRequest } from '@/types';

export const projectsApi = {
  list:       (archived = false) =>
    apiClient.get<Project[]>(`/projects?archived=${archived}`).then(r => r.data),
  get:        (id: string) =>
    apiClient.get<Project>(`/projects/${id}`).then(r => r.data),
  create:     (data: CreateProjectRequest) =>
    apiClient.post<Project>('/projects', data).then(r => r.data),
  update:     (id: string, data: Partial<Project>) =>
    apiClient.put<Project>(`/projects/${id}`, data).then(r => r.data),
  delete:     (id: string) =>
    apiClient.delete(`/projects/${id}`).then(r => r.data),
  listFiles:  (id: string) =>
    apiClient.get<ProjectFile[]>(`/projects/${id}/files`).then(r => r.data),
  uploadFile: (id: string, file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return apiClient.post<ProjectFile>(`/projects/${id}/files`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
  },
  deleteFile: (projectId: string, fileId: string) =>
    apiClient.delete(`/projects/${projectId}/files/${fileId}`).then(r => r.data),
};
