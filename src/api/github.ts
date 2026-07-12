import { apiClient } from './client';

export interface GitHubRepo {
  full_name: string;
  html_url: string;
  description: string | null;
  private: boolean;
  updated_at: string;
}

export async function listGitHubRepos(q?: string): Promise<GitHubRepo[]> {
  const { data } = await apiClient.get<{ data: GitHubRepo[] }>('/github/repos', {
    params: q ? { q } : undefined,
  });
  return data.data;
}
