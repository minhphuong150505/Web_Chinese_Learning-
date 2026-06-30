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

export interface CreateConversationRequest {
  topicTitle: string;
  scenario: string;
  /** 1-6 for HSK exam-prep conversations; omitted for free custom conversations. */
  hskLevel?: number;
  /** Practice language ('zh' | 'en'); defaults to 'zh' on the backend when omitted. */
  lang?: string;
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
