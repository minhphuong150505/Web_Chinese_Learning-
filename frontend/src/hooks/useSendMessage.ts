import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';
import type { ChatResponse, MessageDto } from '../types/chat';

interface UseSendMessageOptions {
  onAssistantMessage?: (message: MessageDto) => void;
}

export function useSendMessage(conversationId: string | undefined, options: UseSendMessageOptions = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (content: string) =>
      apiClient
        .post<ChatResponse>(`/conversations/${conversationId}/messages`, { content })
        .then((r) => r.data),
    onSuccess: (data) => {
      queryClient.setQueryData<MessageDto[]>(['messages', conversationId], (prev) => [
        ...(prev ?? []),
        data.userMessage,
        data.assistantMessage,
      ]);
      options.onAssistantMessage?.(data.assistantMessage);
    },
  });
}
