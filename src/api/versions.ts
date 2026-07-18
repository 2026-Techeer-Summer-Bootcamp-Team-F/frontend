import { apiClient } from './client';

// 스캔 버전 관리(#37) — 백엔드 #132 계약과 1:1.
// - GET /projects/{id}/scan-history  → 스캔 이력 요약(좌측 목록)
// - GET /scans/{id}/version-diff     → 기법별 판정 변화 + 코드 diff

export interface ScanHistoryItem {
  scan_id: number;
  date: string | null;                 // YYYY-MM-DD
  commit_sha: string | null;           // 전체 SHA(표시 시 7자 truncate)
  status: 'pending' | 'running' | 'done' | 'failed' | 'cancelled';
  total_objectives: number;
  defended: number;                    // 방어 확정(미확정 제외)
  breach_count: number;                // 돌파 목표 수
}

export interface ScanHistory {
  target_id: number;
  project_name: string;
  scans: ScanHistoryItem[];            // 최신순
}

export type VerdictStatus = 'breached' | 'defended';

export interface TechniqueSide {
  status: VerdictStatus;
  score: number;                       // 기법 최고 fitness
}

// solved: 돌파→방어 / open: 돌파→돌파 / keep: 방어→방어 / regressed: 방어→돌파
export type Verdict = 'solved' | 'open' | 'keep' | 'regressed';

export interface TechniqueVerdict {
  atlas_technique_id: string;
  name: string;
  before: TechniqueSide | null;        // 이전 스캔에 없던 기법이면 null
  after: TechniqueSide;
  verdict: Verdict;
}

export type DiffLineTag = '' | 'add' | 'del';

export interface DiffLine {
  n: number;                           // 줄번호
  t: DiffLineTag;                      // '' 컨텍스트 / add 추가 / del 삭제
  c: string;                           // 원문(렌더 시 이스케이프)
}

export type DiffKind = 'mod' | 'new' | 'del';

export interface DiffFile {
  path: string;
  kind: DiffKind;
  before: DiffLine[] | null;           // 신규 파일이면 null
  after: DiffLine[] | null;            // 삭제 파일이면 null
}

export interface VersionDiff {
  scan_id: number;
  base_scan_id: number | null;
  head_sha: string | null;
  base_sha: string | null;
  baseline: boolean;                   // 이전 스캔 없음 → 빈 상태
  results: TechniqueVerdict[];
  files: DiffFile[];
  diff_error?: string;                 // diff를 못 가져온 사유(폴백 안내)
}

export async function getScanHistory(projectId: number): Promise<ScanHistory> {
  const { data } = await apiClient.get<ScanHistory>(`/projects/${projectId}/scan-history`);
  return data;
}

export async function getVersionDiff(scanId: number, base?: number): Promise<VersionDiff> {
  const { data } = await apiClient.get<VersionDiff>(`/scans/${scanId}/version-diff`, {
    params: base != null ? { base } : undefined,
  });
  return data;
}
