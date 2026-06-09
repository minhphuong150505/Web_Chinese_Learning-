import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';
import { useAuth } from './useAuth';
import type { AuthResponse } from '../types/auth';

export interface LoginPayload {
  email: string;
  password: string;
}

export function useLogin() {
  const auth = useAuth();
  return useMutation({
    mutationFn: (payload: LoginPayload) =>
      apiClient.post<AuthResponse>('/auth/login', payload).then((response) => response.data),
    onSuccess: (data) => auth.login(data.token, data.user),
  });
}
