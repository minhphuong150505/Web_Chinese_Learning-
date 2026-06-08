import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';
import type { Direction, TranslationRequest, TranslationResponse } from '../types/translation';

export function useTranslation() {
  return useMutation({
    mutationFn: ({ text, direction }: { text: string; direction: Direction }) =>
      apiClient
        .post<TranslationResponse>('/translation', { text, direction } satisfies TranslationRequest)
        .then((r) => r.data),
  });
}
