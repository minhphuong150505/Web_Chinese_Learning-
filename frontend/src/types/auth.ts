export interface User {
  id: string;
  email: string;
  displayName: string;
  hasPassword: boolean;
}

export interface AuthResponse {
  token: string;
  user: User;
}
