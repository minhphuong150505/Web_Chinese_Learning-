import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';
import type { WritingFeedbackRequest, WritingFeedbackResponse } from '../types/writing';

export function useWritingFeedback() {
  return useMutation({
    mutationFn: ({ text, topic }: { text: string; topic: string | null }) =>
      apiClient
        .post<WritingFeedbackResponse>('/writing/feedback', { text, topic } satisfies WritingFeedbackRequest)
        .then((r) => r.data),
  });
}
