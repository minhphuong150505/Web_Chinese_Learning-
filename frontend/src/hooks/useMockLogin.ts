import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';
import { useAuth } from './useAuth';
import type { AuthResponse } from '../types/auth';

interface MockLoginPayload {
  email: string;
  password: string;
}

export function useMockLogin() {
  const auth = useAuth();
  return useMutation({
    mutationFn: (payload: MockLoginPayload) =>
      apiClient.post<AuthResponse>('/auth/mock', payload).then((r) => r.data),
    onSuccess: (data) => auth.login(data.token, data.user),
  });
}
