import { apiClient } from './client';

export interface AuthUser {
  user_id: number;
  github_id: string;
  github_name: string;
  name: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: AuthUser;
}

export async function getGitHubLoginUrl(): Promise<string> {
  const { data } = await apiClient.get<{ authorize_url: string }>('/auth/github/login');
  return data.authorize_url;
}

export async function handleGitHubCallback(code: string, state: string): Promise<AuthResponse> {
  const { data } = await apiClient.get<AuthResponse>('/auth/github/callback', {
    params: { code, state },
  });
  return data;
}

export async function getMe(): Promise<AuthUser> {
  const { data } = await apiClient.get<AuthUser>('/auth/me');
  return data;
}

export async function logout(): Promise<void> {
  await apiClient.post('/auth/logout');
}
