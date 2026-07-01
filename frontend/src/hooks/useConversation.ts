import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '../lib/apiClient';
import { useTargetLanguage } from '../i18n/TargetLanguageProvider';
import type { ConversationDto, CreateConversationRequest, MessageDto } from '../types/chat';

export function useConversation() {
  const queryClient = useQueryClient();
  const { target } = useTargetLanguage();
  const [selectedConversationId, setSelectedConversationId] = useState<string | undefined>();

  const conversations = useQuery({
    queryKey: ['conversations'],
    queryFn: () => apiClient.get<ConversationDto[]>('/conversations').then((r) => r.data),
  });

  const createConversation = useMutation({
    mutationFn: (request: CreateConversationRequest) =>
      apiClient.post<ConversationDto>('/conversations', request).then((r) => r.data),
    onSuccess: (created) => {
      setSelectedConversationId(created.id);
      queryClient.setQueryData<ConversationDto[]>(['conversations'], (prev = []) => [
        created,
        ...prev.filter((conversation) => conversation.id !== created.id),
      ]);
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['messages', created.id] });
    },
  });

  // Only show conversations for the language being practised; legacy rows
  // without a lang predate multi-language support and are Mandarin.
  const list = useMemo(
    () => (conversations.data ?? []).filter((conversation) => (conversation.lang ?? 'zh') === target),
    [conversations.data, target],
  );
  const selectedExists = selectedConversationId
    ? list.some((conversation) => conversation.id === selectedConversationId)
    : false;
  const conversationId = selectedExists ? selectedConversationId : list[0]?.id;
  const selectedConversation = useMemo(
    () => list.find((conversation) => conversation.id === conversationId),
    [conversationId, list],
  );

  useEffect(() => {
    const firstConversation = list[0];
    if (conversations.isSuccess && firstConversation && !conversationId) {
      setSelectedConversationId(firstConversation.id);
    }
  }, [conversationId, conversations.isSuccess, list]);

  const messages = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () =>
      apiClient.get<MessageDto[]>(`/conversations/${conversationId}/messages`).then((r) => r.data),
    enabled: !!conversationId,
  });

  return {
    conversations: list,
    selectedConversation,
    conversationId,
    setConversationId: setSelectedConversationId,
    createConversation,
    messages: messages.data ?? [],
    isLoading: conversations.isLoading || (!!conversationId && messages.isLoading),
  };
}
