import type { User } from '../types';
import { apiClient } from './client';

export async function getMe(): Promise<User> {
  const { data } = await apiClient.get<User>('/api/auth/me');
  return data;
}

export function getGitHubLoginUrl(): string {
  const baseUrl = import.meta.env.VITE_API_BASE_URL ?? '';
  return `${baseUrl}/api/auth/github`;
}
