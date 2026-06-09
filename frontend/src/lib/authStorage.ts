const TOKEN_KEY = 'cl_app_token';
export const AUTH_UNAUTHORIZED_EVENT = 'chinese-learning:unauthorized';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function notifyUnauthorized(): void {
  clearToken();
  window.dispatchEvent(new Event(AUTH_UNAUTHORIZED_EVENT));
}
