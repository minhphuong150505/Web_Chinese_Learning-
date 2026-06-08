import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useEffect } from 'react';
import { apiClient } from '../lib/apiClient';
import type { ConversationDto, MessageDto } from '../types/chat';

export function useConversation() {
  const queryClient = useQueryClient();

  const conversations = useQuery({
    queryKey: ['conversations'],
    queryFn: () => apiClient.get<ConversationDto[]>('/conversations').then((r) => r.data),
  });

  const createConversation = useMutation({
    mutationFn: () => apiClient.post<ConversationDto>('/conversations').then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['conversations'] }),
  });

  const list = conversations.data ?? [];
  const conversationId = list[0]?.id;

  useEffect(() => {
    if (conversations.isSuccess && list.length === 0 && !createConversation.isPending) {
      createConversation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations.isSuccess, list.length]);

  const messages = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () =>
      apiClient.get<MessageDto[]>(`/conversations/${conversationId}/messages`).then((r) => r.data),
    enabled: !!conversationId,
  });

  return {
    conversationId,
    messages: messages.data ?? [],
    isLoading: conversations.isLoading || messages.isLoading || createConversation.isPending,
  };
}
