import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';
import type { ChatResponse, MessageDto } from '../types/chat';

interface UseSendMessageOptions {
  onAssistantMessage?: (message: MessageDto) => void;
}

interface SendMessageMutationContext {
  optimisticUserId?: string;
  previousMessages?: MessageDto[];
}

export function useSendMessage(conversationId: string | undefined, options: UseSendMessageOptions = {}) {
  const queryClient = useQueryClient();
  const queryKey = ['messages', conversationId];

  return useMutation<ChatResponse, Error, string, SendMessageMutationContext>({
    mutationFn: (content) => {
      if (!conversationId) throw new Error('No conversation selected');
      return apiClient
        .post<ChatResponse>(`/conversations/${conversationId}/messages`, { content })
        .then((r) => r.data);
    },
    onMutate: async (content) => {
      if (!conversationId) return {};

      await queryClient.cancelQueries({ queryKey });
      const previousMessages = queryClient.getQueryData<MessageDto[]>(queryKey);
      const optimisticUserId = `optimistic-user-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`;

      queryClient.setQueryData<MessageDto[]>(queryKey, (prev = []) => [
        ...prev,
        {
          id: optimisticUserId,
          role: 'user',
          content,
          audioUrl: null,
          createdAt: new Date().toISOString(),
        },
      ]);

      return { optimisticUserId, previousMessages };
    },
    onError: (_error, _content, context) => {
      if (!conversationId || context?.previousMessages === undefined) return;
      queryClient.setQueryData<MessageDto[]>(queryKey, context.previousMessages);
    },
    onSuccess: (data, _content, context) => {
      queryClient.setQueryData<MessageDto[]>(queryKey, (prev = []) => {
        const withoutOptimistic = context.optimisticUserId
          ? prev.filter((message) => message.id !== context.optimisticUserId)
          : prev;
        const withoutServerDupes = withoutOptimistic.filter(
          (message) =>
            message.id !== data.userMessage.id && message.id !== data.assistantMessage.id,
        );

        return [...withoutServerDupes, data.userMessage, data.assistantMessage];
      });
      options.onAssistantMessage?.(data.assistantMessage);
    },
  });
}
