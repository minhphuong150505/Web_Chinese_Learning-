import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';
import type { PronunciationResponse } from '../types/pronunciation';

export function useAssessPronunciation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      blob,
      referenceText,
      audioConsent = false,
      lang = 'zh',
    }: {
      blob: Blob;
      referenceText: string;
      audioConsent?: boolean;
      lang?: string;
    }) => {
      const fd = new FormData();
      fd.append('audio', blob, 'recording.webm');
      fd.append('referenceText', referenceText);
      // Round 26 Phase 0: only sent true when the learner opted in to contribute
      // their recording to the tone-grading dataset.
      fd.append('audioConsent', String(audioConsent));
      // Target language: 'zh' runs the tone engine; 'en' (etc.) uses Azure only.
      fd.append('lang', lang);
      const r = await apiClient.post<PronunciationResponse>('/pronunciation/assess', fd);
      return r.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pronunciation', 'history'] }),
  });
}

export function usePronunciationHistory() {
  return useQuery({
    queryKey: ['pronunciation', 'history'],
    queryFn: () =>
      apiClient.get<PronunciationResponse[]>('/pronunciation/history').then((r) => r.data),
  });
}
