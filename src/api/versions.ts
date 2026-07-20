import { apiClient } from './client';

// 스캔 버전 관리(#45) — 리포트 ↔ 리포트 비교 분석.
// 코드 diff(구 #37/#132)는 취약점↔파일 매핑이 부정확해 폐기했고, 비교는 전부 프론트에서
// 계산한다(신규 엔드포인트 없음). 이 파일은 비교 대상 스캔 목록만 담당한다.
// - GET /projects/{id}/scan-history → 스캔 이력 + 스캔별 집계(§1 KPI·§4 추세 원본)

export interface ScanHistoryItem {
  scan_id: number;
  date: string | null;                 // YYYY-MM-DD
  commit_sha: string | null;           // 전체 SHA(표시 시 7자 truncate)
  status: 'pending' | 'running' | 'done' | 'failed' | 'cancelled';
  total_objectives: number;
  defended: number;                    // 방어 확정(미확정 제외)
  breach_count: number;                // 돌파 목표 수
  risk_score: number;                  // 종합 위험도 0~100 (백엔드 #144)
  critical_count: number;              // Critical 취약점 수 (백엔드 #144)
}

export interface ScanHistory {
  target_id: number;
  project_name: string;
  scans: ScanHistoryItem[];            // 최신순
}

export async function getScanHistory(projectId: number): Promise<ScanHistory> {
  const { data } = await apiClient.get<ScanHistory>(`/projects/${projectId}/scan-history`);
  return data;
}
