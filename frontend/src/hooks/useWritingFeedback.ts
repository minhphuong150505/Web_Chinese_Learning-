import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';
import type {
  CreateWritingPromptRequest,
  WritingFeedbackRequest,
  WritingFeedbackResponse,
  WritingPromptResponse,
} from '../types/writing';

export function useWritingPrompt() {
  return useMutation({
    mutationFn: (request: CreateWritingPromptRequest) =>
      apiClient.post<WritingPromptResponse>('/writing/prompts', request).then((r) => r.data),
  });
}

export function useWritingFeedback() {
  return useMutation({
    mutationFn: ({ text, topic, lang }: { text: string; topic: string | null; lang?: string }) =>
      apiClient
        .post<WritingFeedbackResponse>('/writing/feedback', { text, topic, lang } satisfies WritingFeedbackRequest)
        .then((r) => r.data),
  });
}
