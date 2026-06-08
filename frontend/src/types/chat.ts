export type Role = 'user' | 'assistant' | 'system';

export interface MessageDto {
  id: string;
  role: Role;
  content: string;
  audioUrl: string | null;
  createdAt: string;
}

export interface ConversationDto {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatResponse {
  userMessage: MessageDto;
  assistantMessage: MessageDto;
}
