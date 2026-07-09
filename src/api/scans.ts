import { apiClient } from './client';

export interface ScanConfig {
  attack_types: string[];
  target_model: string;
  population_size?: number;
  max_generations?: number;
}

export interface Scan {
  scan_id: number;
  target_id: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  config: ScanConfig;
  progress: {
    generation: number;
    evaluated: number;
    best_score: number;
    phase: string;
  } | null;
  started_at: string | null;
  finished_at: string | null;
}

export interface ScanReport {
  report_id: number;
  scan_id: number;
  total_objectives: number;
  breached_count: number;
  coverage_pct: number;
  severity_counts: { critical: number; high: number; medium: number };
  risk_score: number;
  stats: {
    total_attempts: number;
    breached_attempts: number;
    findings: number;
  };
  ai_summary?: string;
}

export interface HeatmapTechnique {
  atlas_technique_id: string;
  name: string;
  status: 'breached' | 'safe' | 'untested';
  attempts: number;
  best_score: number;
}

export interface Finding {
  findings_id: number;
  objective_id: number;
  attempt_id: number;
  atlas_technique_id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  evidence: { prompt: string; response: string; canary?: string };
  mitigation: string;
}

export async function startScan(
  targetId: number,
  config: ScanConfig,
): Promise<{ scan_id: number; status: string }> {
  const { data } = await apiClient.post('/scans', { target_id: targetId, config });
  return data;
}

export async function getScan(scanId: number): Promise<Scan> {
  const { data } = await apiClient.get<Scan>(`/scans/${scanId}`);
  return data;
}

export async function cancelScan(scanId: number): Promise<void> {
  await apiClient.post(`/scans/${scanId}/cancel`);
}

export async function getScanReport(scanId: number): Promise<ScanReport> {
  const { data } = await apiClient.get<ScanReport>(`/scans/${scanId}/report`);
  return data;
}

export async function getScanHeatmap(scanId: number): Promise<{ techniques: HeatmapTechnique[] }> {
  const { data } = await apiClient.get(`/scans/${scanId}/heatmap`);
  return data;
}

export async function getScanFindings(scanId: number): Promise<Finding[]> {
  const { data } = await apiClient.get<Finding[]>(`/scans/${scanId}/findings`);
  return data;
}

export async function listScans(targetId?: number): Promise<Scan[]> {
  const { data } = await apiClient.get<Scan[]>('/scans', {
    params: targetId ? { target_id: targetId } : undefined,
  });
  return data;
}
