import { apiClient } from './client';

export interface ActorConfig {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body_template?: string;
  response_path?: string;
  max_retries?: number;
}

export interface Project {
  target_id: number;
  user_id: number;
  project_name: string;
  actor_type: 'http' | 'browser';
  config: ActorConfig;
  purpose: string | null;
  system_prompt: string | null;
  repo_url: string | null;
  model: string | null;
  defences: string[];
  tools: string[];
  created_at: string;
}

export interface CreateProjectPayload {
  project_name: string;
  actor_type: 'http' | 'browser';
  config: ActorConfig;
  purpose?: string;
  system_prompt?: string;
  repo_url?: string;
}

export async function createProject(payload: CreateProjectPayload): Promise<Project> {
  const { data } = await apiClient.post<Project>('/projects', payload);
  return data;
}

export async function listProjects(): Promise<Project[]> {
  const { data } = await apiClient.get<Project[]>('/projects');
  return data;
}

export async function getProject(id: number): Promise<Project> {
  const { data } = await apiClient.get<Project>(`/projects/${id}`);
  return data;
}

export async function deleteProject(id: number): Promise<void> {
  await apiClient.delete(`/projects/${id}`);
}

export async function listAttackTypes(): Promise<AttackType[]> {
  const { data } = await apiClient.get<{ key: string; label: string; atlas_technique_id: string }[]>('/attack-types');
  return data.map(t => ({ key: t.key, label: t.label, atlas: t.atlas_technique_id, category: '' }));
}

export interface AttackType {
  key: string;
  label: string;
  atlas: string;
  category: string;
}
