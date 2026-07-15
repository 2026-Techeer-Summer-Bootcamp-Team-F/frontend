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
  status: 'pending' | 'running' | 'done' | 'failed' | 'cancelled';
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
  severity_counts: { critical: number; high: number; medium: number; low?: number };
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
  tactic?: string;
  dist?: { defended: number; partial: number; breached: number };
}

export interface MitigationRef {
  label: string;
  url: string;
}

// 백엔드 #79: 기법별 구조화 완화 정본. GET /scans/{id}/findings가 반환.
export interface MitigationDetail {
  summary: string;
  cause: string;
  steps: string[];
  verify: string;
  references: MitigationRef[];
}

export interface CodeLocation {
  file: string;
  line: number;
  snippet: string;
  atlas_id: string;
  reason: string;
  fix?: string;                              // 앱 맞춤 수정 제안(코드래빗식) — 백엔드 #111
  context?: { line: number; code: string }[]; // 앞뒤 코드 ±3줄 — 백엔드 #111
}

export interface Finding {
  findings_id: number;
  objective_id: number;
  attempt_id: number;
  atlas_technique_id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  evidence: { prompt: string; response: string; canary?: string };
  mitigation: MitigationDetail;
}

const EMPTY_MITIGATION: MitigationDetail = {
  summary: '', cause: '', steps: [], verify: '', references: [],
};

// 완화 응답 정규화 — 객체면 필드 보정, 구버전 문자열/누락이면 안전한 빈 구조로 폴백.
function normalizeMitigation(raw: MitigationDetail | string | null | undefined): MitigationDetail {
  if (raw && typeof raw === 'object') {
    return {
      summary: raw.summary ?? '',
      cause: raw.cause ?? '',
      steps: Array.isArray(raw.steps) ? raw.steps : [],
      verify: raw.verify ?? '',
      references: Array.isArray(raw.references) ? raw.references : [],
    };
  }
  return { ...EMPTY_MITIGATION, summary: typeof raw === 'string' ? raw : '' };
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
  const { data } = await apiClient.get<{ scan_id: number; cells: HeatmapTechnique[] }>(`/scans/${scanId}/heatmap`);
  return { techniques: data.cells };
}

export async function getScanFindings(scanId: number): Promise<Finding[]> {
  const { data } = await apiClient.get<{
    findings_id: number;
    severity: 'critical' | 'high' | 'medium' | 'low';
    atlas_technique_id: string | null;
    technique_name: string | null;
    attempt_id: number;
    prompt: string | null;
    evidence: { prompt?: string; response?: string; canary_hit?: boolean } | null;
    mitigation: MitigationDetail | string | null;
  }[]>(`/scans/${scanId}/findings`);
  return data.map(f => ({
    findings_id: f.findings_id,
    objective_id: 0,
    attempt_id: f.attempt_id,
    atlas_technique_id: f.atlas_technique_id ?? '',
    severity: f.severity,
    title: f.technique_name ?? f.atlas_technique_id ?? '취약점',
    evidence: {
      prompt: f.evidence?.prompt ?? f.prompt ?? '',
      response: f.evidence?.response ?? '',
      canary: f.evidence?.canary_hit ? 'CANARY_HIT' : undefined,
    },
    mitigation: normalizeMitigation(f.mitigation),
  }));
}


export async function getScanSummary(scanId: number): Promise<string> {
  const { data } = await apiClient.get<{ ai_summary: string }>(`/scans/${scanId}/summary`);
  return data.ai_summary;
}

export async function listScans(targetId?: number): Promise<Scan[]> {
  const { data } = await apiClient.get<Scan[]>('/scans', {
    params: targetId ? { target_id: targetId } : undefined,
  });
  return data;
}

export async function getCodeLocations(scanId: number): Promise<CodeLocation[]> {
  try {
    const { data } = await apiClient.get<CodeLocation[]>(`/scans/${scanId}/code-locations`);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}
