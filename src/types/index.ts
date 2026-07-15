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
  status: 'pending' | 'running' | 'done' | 'failed' | 'cancelled';
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

/** 판정(백엔드 judge) — breach=뚫림, safe=막힘, error=액터 오류(표적 무응답) */
export type ScanVerdict = 'breach' | 'safe' | 'error';

/**
 * 공격 발사 **직전** 이벤트 (백엔드 #102). 응답·판정 필드는 아직 없다.
 * 상관 키는 (objective_id, attempt_index) — attempt_id는 이 시점에 DB 행이 없어 안 옴.
 */
export interface ScanAttemptStartedEvent {
  event: 'attempt_started';
  objective_id: number;
  attempt_index: number;
  generation: number;          // 0 = 씨앗, 1~ = 변이 세대
  mutation_op: string;         // 'seed' | expand | crossover | ...
  attack_prompt: string;
  attack_prompt_truncated: boolean;
  atlas: string;
  atlas_name: string;
}

/** 공격 응답·판정 **후** 이벤트 (백엔드 #97). 위 started와 같은 상관 키로 짝이 맞는다. */
export interface ScanAttemptEvent {
  event: 'attempt';
  objective_id: number;
  attempt_id: number;
  attempt_index: number;
  generation: number;
  parent_id: number | null;    // 진화 계보(부모 attempt)
  verdict: ScanVerdict;
  score: number;               // fitness 0.0~1.0
  mutation_op: string;
  atlas: string;
  atlas_name: string;
  prompt: string;              // 200자 요약(기존 터미널 로그용)
  error?: string;              // verdict==='error' 일 때만
  attack_prompt: string;       // 전문(4000자 캡)
  attack_prompt_truncated: boolean;
  target_response: string;     // 전문(4000자 캡)
  target_response_truncated: boolean;
  canary_triggered: boolean;
  flag_token: string | null;   // 노출된 카나리(하이라이트용)
}

export interface ScanResult {
  scan: Scan;
  findings: Finding[];
  attempts: Attempt[];
}
