export type UserRole = 'admin' | 'adult' | 'teen';
export type Theme = 'light' | 'dark' | 'system';

export interface User {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
  age?: number;
  avatarColor: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserSettings {
  userId: string;
  defaultModel: string;
  userSystemPrompt: string;
  theme: Theme;
  showTokenCount: boolean;
  updatedAt: string;
}

export type ParentalRuleType =
  | 'time_restriction'
  | 'daily_message_limit'
  | 'daily_token_budget'
  | 'keyword_block'
  | 'topic_block'
  | 'ai_content_filter';

export interface ParentalRule {
  id: string;
  userId: string;
  ruleType: ParentalRuleType;
  ruleValue: Record<string, unknown>;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  systemInstructions: string;
  isPinned: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  fileCount?: number;   // joined
  chatCount?: number;   // joined
}

export interface ProjectFile {
  id: string;
  projectId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  extractedText?: string;
  createdAt: string;
}

export interface Chat {
  id: string;
  userId: string;
  projectId?: string;
  title: string;
  model: string;
  isPinned: boolean;
  isArchived: boolean;
  totalTokensUsed: number;
  createdAt: string;
  updatedAt: string;
  messageCount?: number;  // joined
  lastMessage?: string;   // joined (snippet)
}

export interface Message {
  id: string;
  chatId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  tokenCount?: number;
  isFlagged: boolean;
  flagReason?: string;
  metadata?: {
    model?: string;
    generationMs?: number;
    finishReason?: string;
  };
  createdAt: string;
  attachments?: Attachment[];  // joined
}

export interface Attachment {
  id: string;
  messageId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  extractedText?: string;
  width?: number;
  height?: number;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  userId?: string;
  userName?: string;   // joined
  eventType: string;
  eventData?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: string;
}

export interface FlaggedContent {
  id: string;
  userId?: string;
  userName?: string;   // joined
  messageId?: string;
  chatId?: string;
  chatTitle?: string;  // joined
  flagType: 'keyword' | 'ai_classifier' | 'manual';
  flagReason: string;
  originalContent: string;
  isReviewed: boolean;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface AIModel {
  name: string;
  size: number;
  digest: string;
  modifiedAt: string;
  details?: {
    parameterSize?: string;
    quantizationLevel?: string;
    contextLength?: number;
    supportsVision?: boolean;
  };
}

export interface AdminStats {
  totalUsers: number;
  totalChats: number;
  totalMessages: number;
  flaggedToday: number;
  usageByUser: Array<{
    userId: string;
    displayName: string;
    role: UserRole;
    messagesTotal: number;
    messagesToday: number;
    chatsTotal: number;
  }>;
  messagesLast7Days: Array<{ date: string; count: number }>;
}

// ---- Request/Response shapes ----

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
  settings: UserSettings;
}

export interface SendMessageRequest {
  content: string;
  attachmentIds?: string[];  // pre-uploaded attachment IDs
}

export interface CreateChatRequest {
  projectId?: string;
  model?: string;
  title?: string;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  systemInstructions?: string;
}

export interface ContentFilterResult {
  blocked: boolean;
  reason?: string;
  flagType?: 'keyword' | 'ai_classifier';
}
