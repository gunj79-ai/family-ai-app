import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi } from '@/api/projects';
import { chatsApi } from '@/api/chats';
import type { CreateProjectRequest } from '@/types';

export function useProjects() {
  const qc = useQueryClient();

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list(),
  });

  const createProject = useMutation({
    mutationFn: (data: CreateProjectRequest) => projectsApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });

  const updateProject = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateProjectRequest> }) =>
      projectsApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });

  const deleteProject = useMutation({
    mutationFn: (id: string) => projectsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });

  return { projects, isLoading, createProject, updateProject, deleteProject };
}

export function useChats(projectId?: string | null) {
  const qc = useQueryClient();

  const { data: chats = [], isLoading } = useQuery({
    queryKey: ['chats', projectId],
    queryFn: () => chatsApi.list(projectId ? { projectId } : undefined),
  });

  const createChat = useMutation({
    mutationFn: (data: { projectId?: string; model?: string; title?: string }) =>
      chatsApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['chats'] }),
  });

  const deleteChat = useMutation({
    mutationFn: (id: string) => chatsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['chats'] }),
  });

  const updateChat = useMutation({
    mutationFn: ({ id, data }: { id: string; data: object }) => chatsApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['chats'] }),
  });

  return { chats, isLoading, createChat, deleteChat, updateChat };
}
