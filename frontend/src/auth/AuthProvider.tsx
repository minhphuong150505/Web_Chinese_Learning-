import { createContext, useEffect, useState, type ReactNode } from 'react';
import { apiClient } from '../lib/apiClient';
import {
  AUTH_UNAUTHORIZED_EVENT,
  clearToken,
  getToken,
  setToken,
} from '../lib/authStorage';
import type { User } from '../types/auth';

export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(getToken());
  const [isLoading, setIsLoading] = useState(Boolean(getToken()));

  useEffect(() => {
    const existing = getToken();
    const handleUnauthorized = () => {
      setTokenState(null);
      setUser(null);
      setIsLoading(false);
    };

    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
    if (existing) {
      apiClient
        .get<User>('/auth/me')
        .then((response) => setUser(response.data))
        .catch(handleUnauthorized)
        .finally(() => setIsLoading(false));
    }

    return () => window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
  }, []);

  function login(nextToken: string, nextUser: User) {
    setToken(nextToken);
    setTokenState(nextToken);
    setUser(nextUser);
    setIsLoading(false);
  }

  function logout() {
    clearToken();
    setTokenState(null);
    setUser(null);
    setIsLoading(false);
  }

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
