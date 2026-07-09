import type { Target } from '../types';
import { apiClient } from './client';

export interface CreateTargetPayload {
  name: string;
  endpoint_url: string;
  model_hint?: string;
  system_prompt_hint?: string;
  repo_url?: string;
  actor_type?: 'http' | 'browser';
}

export async function createTarget(payload: CreateTargetPayload): Promise<Target> {
  const { data } = await apiClient.post<Target>('/api/targets', payload);
  return data;
}

export async function listTargets(): Promise<Target[]> {
  const { data } = await apiClient.get<Target[]>('/api/targets');
  return data;
}

export async function getTarget(targetId: number): Promise<Target> {
  const { data } = await apiClient.get<Target>(`/api/targets/${targetId}`);
  return data;
}
