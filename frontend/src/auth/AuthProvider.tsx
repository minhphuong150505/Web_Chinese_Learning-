import { createContext, useEffect, useState, type ReactNode } from 'react';
import { apiClient } from '../lib/apiClient';
import { clearToken, getToken, setToken } from '../lib/authStorage';
import type { User } from '../types/auth';

export interface AuthState {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(getToken());

  useEffect(() => {
    const existing = getToken();
    if (!existing) return;
    apiClient
      .get<User>('/auth/me')
      .then((r) => setUser(r.data))
      .catch(() => {
        clearToken();
        setTokenState(null);
        setUser(null);
      });
  }, []);

  function login(nextToken: string, nextUser: User) {
    setToken(nextToken);
    setTokenState(nextToken);
    setUser(nextUser);
  }

  function logout() {
    clearToken();
    setTokenState(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
