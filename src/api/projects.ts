import { apiClient } from './client';

export interface ActorConfig {
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  body_template?: string;
  response_path?: string;
  max_retries?: number;
  actor_type?: string;
  [key: string]: unknown;
}

export interface Project {
  target_id: number;
  project_name: string;
  actor_type: string;
  config?: ActorConfig;
  purpose?: string | null;
  system_prompt?: string | null;
  repo_url?: string | null;
  model?: string | null;
  defences?: Record<string, unknown>;
  tools?: Record<string, unknown>;
  created_at: string;
}

export interface CreateProjectPayload {
  project_name: string;
  actor_type: string;
  config: ActorConfig;
  purpose?: string;
  system_prompt?: string;
  repo_url?: string;
}

export async function createProject(payload: CreateProjectPayload): Promise<Project> {
  const { data } = await apiClient.post<Project>('/projects', payload);
  return data;
}

export interface DetectResult {
  detected: boolean;
  source: string;
  confidence?: number;
  route_path?: string | null;
  config?: ActorConfig | null;
}

// 레포에서 HTTP 연결 config 자동 감지(등록 폼 프리필). 실패 시 detected=false → 프리셋 폴백.
export async function detectConfig(payload: { repo_url?: string; url?: string }): Promise<DetectResult> {
  const { data } = await apiClient.post<DetectResult>('/projects/detect', payload);
  return data;
}

export async function listProjects(): Promise<Project[]> {
  const { data } = await apiClient.get<{ data: Project[] }>('/projects');
  return data.data;
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
