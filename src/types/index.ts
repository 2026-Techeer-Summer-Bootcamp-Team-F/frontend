export interface User {
  user_id: number;
  github_id: string;
  github_name: string;
  name: string;
}

export interface Target {
  id: number;
  owner_id: number;
  name: string;
  endpoint_url: string;
  model_hint: string | null;
  system_prompt_hint: string | null;
  repo_url: string | null;
  actor_type: 'http' | 'browser';
  created_at: string;
}

export interface Scan {
  id: number;
  target_id: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
}

export interface Attempt {
  id: number;
  scan_id: number;
  parent_attempt_id: number | null;
  seed_case_id: number | null;
  generation: number;
  prompt_text: string;
  response_text: string | null;
  fitness: number;
  mutation_operator: string | null;
  atlas_technique_ids: string[];
  success: boolean;
  created_at: string;
}

export interface Finding {
  id: number;
  scan_id: number;
  attempt_id: number;
  attack_type: string;
  atlas_technique_ids: string[];
  evidence: string | null;
  created_at: string;
}

/** SSE 이벤트: /api/scans/{scan_id}/stream 에서 수신 */
export interface ScanProgressEvent {
  generation: number;
  seed_id: string;
  fitness: number;
  mutation_op: string | null;
  success: boolean;
  prompt_preview: string;
}

export interface ScanResult {
  scan: Scan;
  findings: Finding[];
  attempts: Attempt[];
}
