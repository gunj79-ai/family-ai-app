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
  | 'model_restriction'
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
  fileCount?: number;
  chatCount?: number;
}

export interface ProjectFile {
  id: string;
  projectId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  extractedText?: string;
  width?: number;
  height?: number;
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
  messageCount?: number;
  lastMessage?: string;
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
  attachments?: Attachment[];
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
  userName?: string;
  eventType: string;
  eventData?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: string;
}

export interface FlaggedContent {
  id: string;
  userId?: string;
  userName?: string;
  messageId?: string;
  chatId?: string;
  chatTitle?: string;
  flagType: 'keyword' | 'ai_classifier' | 'manual';
  flagReason: string;
  originalContent: string;
  isReviewed: boolean;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface OllamaModel {
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
  estimatedCostTodayUsd: number;
  estimatedCostThisMonthUsd: number;
  usageByUser: Array<{
    userId: string;
    displayName: string;
    role: UserRole;
    messagesTotal: number;
    messagesToday: number;
    chatsTotal: number;
    tokensTotal: number;
    estimatedCostTodayUsd: number;
  }>;
  tokenUsageByUser: Array<{
    userId: string;
    displayName: string;
    tokensToday: number;
    estimatedCostTodayUsd: number;
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
  attachmentIds?: string[];
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
