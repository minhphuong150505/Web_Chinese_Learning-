import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';
import { useAuth } from './useAuth';
import type { AuthResponse } from '../types/auth';

export function useGoogleLogin() {
  const auth = useAuth();
  return useMutation({
    mutationFn: (idToken: string) =>
      apiClient.post<AuthResponse>('/auth/google', { idToken }).then((r) => r.data),
    onSuccess: (data) => auth.login(data.token, data.user),
  });
}
