import type { PronunciationResponse } from './pronunciation';

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

export interface VoiceTurnResponse extends ChatResponse {
  pronunciation: PronunciationResponse;
  contextScore: number;
  grammarScore: number;
  feedback: string;
  suggestedReply: string;
}
