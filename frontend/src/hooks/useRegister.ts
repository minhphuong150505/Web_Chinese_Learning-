import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';
import { useAuth } from './useAuth';
import type { AuthResponse } from '../types/auth';

export interface RegisterPayload {
  displayName: string;
  email: string;
  password: string;
}

export function useRegister() {
  const auth = useAuth();
  return useMutation({
    mutationFn: (payload: RegisterPayload) =>
      apiClient.post<AuthResponse>('/auth/register', payload).then((response) => response.data),
    onSuccess: (data) => auth.login(data.token, data.user),
  });
}
