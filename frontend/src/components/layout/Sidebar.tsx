import { useState, useRef } from 'react';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Plus, MessageSquare, FolderOpen, ChevronDown,
  ChevronRight, Settings, LogOut, Shield, Trash2, Pin, MoreVertical, Edit, FolderPlus
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { useChatStore } from '@/store/chatStore';
import { useProjects, useChats } from '@/hooks/useProjects';
import { useChat } from '@/hooks/useChat';
import { useToastStore } from '@/hooks/useToast';
import { relativeTime } from '@/utils/dates';
import { authApi } from '@/api/auth';
import { ProjectModal } from '@/components/project/ProjectModal';
import { chatsApi } from '@/api/chats';
import { EvaAvatar } from '@/components/eva/EvaAvatar';
import type { Chat, Project, CreateProjectRequest } from '@/types';

export function Sidebar() {
  const navigate = useNavigate();
  const { chatId } = useParams<{ chatId: string }>();
  const { user, logout } = useAuthStore();
  const isMobile = useIsMobile();
  const { activeProjectId, setActiveProject } = useUIStore();
  const { setSidebarOpen } = useUIStore();
  const { setActiveChat, setMessages } = useChatStore();
  const { createChat, loadChat } = useChat();

  const { projects, createProject, updateProject, deleteProject } = useProjects();
  const { chats, deleteChat, updateChat } = useChats(activeProjectId);
  const [projectsOpen, setProjectsOpen] = useState(true);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | undefined>();
  const [chatContextMenu, setChatContextMenu] = useState<{ chatId: string; x: number; y: number } | null>(null);
  const [parent] = useAutoAnimate();

  async function handleNewChat() {
    const chat = await createChat(activeProjectId || undefined);
    setActiveChat(chat);
    setMessages([]);
    navigate(`/chat/${chat.id}`);
  }

  async function handleSelectChat(chat: Chat) {
    try {
      await loadChat(chat);
      navigate(`/chat/${chat.id}`);
      if (isMobile) setSidebarOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load chat';
      useToastStore.getState().addToast(message, 'error');
    }
  }

  async function handleLogout() {
    await authApi.logout().catch(() => {});
    logout();
    navigate('/login');
  }

  function handleRename(chat: Chat) {
    setRenaming(chat.id);
    setRenameValue(chat.title);
  }

  async function submitRename(chatId: string) {
    if (renameValue.trim()) {
      await updateChat.mutateAsync({ id: chatId, data: { title: renameValue.trim() } });
    }
    setRenaming(null);
  }

  async function handleSaveProject(data: CreateProjectRequest | Partial<Project>) {
    try {
      if (editingProject) {
        await updateProject.mutateAsync({ id: editingProject.id, data });
      } else {
        await createProject.mutateAsync(data as CreateProjectRequest);
      }
      setProjectModalOpen(false);
      setEditingProject(undefined);
    } catch (error) {
      console.error('Error saving project:', error);
    }
  }

  function handleEditProject(project: Project) {
    setEditingProject(project);
    setProjectModalOpen(true);
  }

  async function handleDeleteProject(projectId: string) {
    if (confirm('Delete this project and all associated chats?')) {
      await deleteProject.mutateAsync(projectId);
      if (activeProjectId === projectId) {
        setActiveProject(null);
      }
    }
  }

  function handleChatContextMenu(e: React.MouseEvent, chatId: string) {
    e.preventDefault();
    e.stopPropagation();
    setChatContextMenu({ chatId, x: e.clientX, y: e.clientY });
  }

  async function moveToProject(chatId: string, projectId: string | null) {
    await updateChat.mutateAsync({ id: chatId, data: { projectId } });
    setChatContextMenu(null);
  }

  return (
    <div className="flex flex-col h-full bg-surface-subtle border-r border-gray-100">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100">
        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center flex-shrink-0 border border-gray-200 overflow-hidden">
          <EvaAvatar size={40} />
        </div>
        <div className="flex-1 min-w-0">
          <span className="font-bold text-gray-900 text-lg block">Eva</span>
          <span className="text-xs text-gray-500">Your AI Assistant</span>
        </div>
      </div>

      {/* New chat */}
      <div className="px-3 py-3">
        <button
          onClick={handleNewChat}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200 transition-all"
        >
          <Plus className="w-4 h-4 text-primary-500" />
          New Chat
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-3 pb-3">
        {/* Projects */}
        <div className="mb-4">
          <div className="flex items-center justify-between px-2 py-1">
            <button
              onClick={() => setProjectsOpen(o => !o)}
              className="flex items-center gap-1 flex-1 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700"
            >
              {projectsOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              Projects
            </button>
            <button
              onClick={() => {
                setEditingProject(undefined);
                setProjectModalOpen(true);
              }}
              className="p-1 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
              title="Create new project"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
          {projectsOpen && (
            <div className="mt-1 space-y-0.5">
              <button
                onClick={() => setActiveProject(null)}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-left transition-colors duration-100',
                  activeProjectId === null ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-white'
                )}
              >
                <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
                All chats
              </button>
              {projects.length === 0 ? (
                <p className="px-3 py-2 text-xs text-gray-400">No projects yet</p>
              ) : (
                projects.map((p: Project) => (
                  <div key={p.id} className="group flex items-center">
                    <button
                      onClick={() => setActiveProject(p.id)}
                      className={cn(
                        'flex-1 flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-left transition-colors duration-100',
                        activeProjectId === p.id ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-white'
                      )}
                    >
                      <span className="text-base leading-none">{p.icon}</span>
                      <span className="truncate">{p.name}</span>
                      {p.chatCount ? <span className="text-xs text-gray-400 ml-auto">{p.chatCount}</span> : null}
                    </button>
                    <div className="hidden group-hover:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEditProject(p)}
                        className="p-1 text-gray-400 hover:text-primary-600 rounded transition-colors"
                        title="Edit project"
                      >
                        <Edit className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleDeleteProject(p.id)}
                        className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
                        title="Delete project"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Chats */}
        <div>
          <span className="text-[11px] uppercase tracking-widest font-semibold text-gray-400 px-2 py-1 block">
            Chats
          </span>
          <div className="mt-1 space-y-0.5" ref={parent}>
            {chats.length === 0 ? (
              <p className="px-3 py-2 text-xs text-gray-400">No chats yet</p>
            ) : (
              chats.map((chat: Chat) => (
                <div key={chat.id} className="group relative">
                  {renaming === chat.id ? (
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={e => setRenameValue(e.target.value)}
                      onBlur={() => submitRename(chat.id)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') submitRename(chat.id);
                        if (e.key === 'Escape') setRenaming(null);
                      }}
                      className="w-full px-3 py-1.5 text-sm border border-primary-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  ) : (
                    <button
                      onClick={() => handleSelectChat(chat)}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors duration-100',
                        chatId === chat.id
                          ? 'bg-white border-l-2 border-primary-500 text-gray-900'
                          : 'text-gray-600 hover:bg-white transition-colors duration-100'
                      )}
                    >
                      {chat.isPinned && <Pin className="w-3 h-3 text-primary-400 flex-shrink-0" />}
                      <span className="truncate flex-1">{chat.title}</span>
                      <span className="text-xs text-gray-400 flex-shrink-0 opacity-0 group-hover:opacity-100">
                        {relativeTime(chat.updatedAt)}
                      </span>
                    </button>
                  )}
                  {!renaming && (
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-0.5 bg-white shadow-sm rounded border border-gray-100 px-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRename(chat); }}
                        className="p-0.5 text-gray-400 hover:text-gray-600"
                        title="Rename"
                      >✎</button>
                      <button
                        onClick={(e) => handleChatContextMenu(e, chat.id)}
                        className="p-0.5 text-gray-400 hover:text-primary-600"
                        title="More options"
                      >
                        <MoreVertical className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Delete this chat?')) deleteChat.mutate(chat.id);
                        }}
                        className="p-0.5 text-gray-400 hover:text-red-500"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-100 px-3 py-3 space-y-1">
        {user?.role === 'admin' && (
          <>
            <button
              onClick={() => navigate('/admin')}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-white rounded-lg transition-colors"
            >
              <Shield className="w-4 h-4" /> Admin Dashboard
            </button>
            <button
              onClick={() => navigate('/settings')}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-white rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4" /> Settings
            </button>
          </>
        )}
        <div className="flex items-center gap-2 px-3 py-2">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ backgroundColor: user?.avatarColor || '#6366f1' }}
          >
            {user?.displayName?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-700 truncate">{user?.displayName}</div>
            <div className="text-xs text-gray-400 capitalize">{user?.role}</div>
          </div>
          <button onClick={handleLogout} className="text-gray-400 hover:text-gray-600" title="Sign out">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Project Modal */}
      <ProjectModal
        isOpen={projectModalOpen}
        project={editingProject}
        onClose={() => {
          setProjectModalOpen(false);
          setEditingProject(undefined);
        }}
        onSave={handleSaveProject}
        isLoading={createProject.isPending || updateProject.isPending}
      />

      {/* Chat Context Menu - Move to Project */}
      {chatContextMenu && (
        <div
          className="fixed bg-white rounded-lg shadow-lg border border-gray-200 z-50 min-w-40 py-1"
          style={{ left: `${chatContextMenu.x}px`, top: `${chatContextMenu.y}px` }}
          onMouseLeave={() => setChatContextMenu(null)}
        >
          <p className="px-3 py-1.5 text-xs font-medium text-gray-500 uppercase">Move to project</p>
          <button
            onClick={() => moveToProject(chatContextMenu.chatId, null)}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 text-left"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            No project
          </button>
          {projects.map(p => (
            <button
              key={p.id}
              onClick={() => moveToProject(chatContextMenu.chatId, p.id)}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 text-left"
            >
              <span className="text-base">{p.icon}</span>
              {p.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
