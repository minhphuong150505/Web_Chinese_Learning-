import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';
import type { MessageDto, VoiceTurnResponse } from '../types/chat';

export function useVoiceTurn(conversationId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (blob: Blob) => {
      if (!conversationId) throw new Error('Conversation is not ready');
      const form = new FormData();
      form.append('audio', blob, 'voice-turn.webm');
      const response = await apiClient.post<VoiceTurnResponse>(
        `/conversations/${conversationId}/voice-turn`,
        form,
      );
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData<MessageDto[]>(['messages', conversationId], (old = []) => [
        ...old,
        data.userMessage,
        data.assistantMessage,
      ]);
      queryClient.invalidateQueries({ queryKey: ['pronunciation', 'history'] });
    },
  });
}
