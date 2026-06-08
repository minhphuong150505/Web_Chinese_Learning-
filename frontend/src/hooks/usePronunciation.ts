import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';
import type { PronunciationResponse } from '../types/pronunciation';

export function useAssessPronunciation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ blob, referenceText }: { blob: Blob; referenceText: string }) => {
      const fd = new FormData();
      fd.append('audio', blob, 'recording.webm');
      fd.append('referenceText', referenceText);
      const r = await apiClient.post<PronunciationResponse>('/pronunciation/assess', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
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
