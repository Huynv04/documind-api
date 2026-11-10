export type UserRole = 'EMPLOYEE' | 'KNOWLEDGE_MANAGER' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface ApiErrorResponse {
  statusCode?: number;
  message: string | string[];
  error?: string;
}

