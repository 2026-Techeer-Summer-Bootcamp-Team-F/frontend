// 스캔 ↔ 스캔 비교 계산(#45) — 전부 순수 함수. 백엔드 신규 엔드포인트 없이
// heatmap·findings·scan-history 응답만으로 §1~§5의 값을 만든다.
//
// 신뢰성 원칙: 두 스캔은 동일 조건의 재현 실험이 아니므로 "고쳐졌다"고 단정하지 않고
// "관측된 변화"로만 표기하고, 표본이 적거나 변화 폭이 미미하면 경고를 붙인다.

import type { Finding, HeatmapTechnique } from '../api/scans';
import type { ScanHistoryItem } from '../api/versions';

/** |Δbest_score|가 이 값 미만이면 "사실상 변화 없음"으로 본다. */
const NEGLIGIBLE_DELTA = 0.05;
/** 어느 한쪽 스캔의 기법 시도 수가 이 값 미만이면 저표본(노이즈 가능)으로 경고한다. */
const LOW_SAMPLE_ATTEMPTS = 3;
/** 문장·라벨에 기법 이름을 나열할 때 최대 개수(나머지는 "외 N건"). */
const NAME_LIST_MAX = 3;

export type TechStatus = 'breached' | 'safe';
/** 개선=돌파→방어 / 잔존=돌파→돌파 / 후퇴·신규=방어(또는 없음)→돌파 / 유지=방어→방어 */
export type Bucket = 'improved' | 'persisted' | 'regressed' | 'kept';

export interface TechSide {
  status: TechStatus;
  score: number;                       // 그 기법의 best fitness
  attempts: number;
}

export interface TechRow {
  atlasId: string;
  name: string;
  before: TechSide | null;             // 이전 스캔에 없거나 미측정이면 null(=신규)
  after: TechSide;
  bucket: Bucket;
  delta: number;                       // after.score - before.score (before 없으면 0)
  negligible: boolean;                 // 변화 폭이 임계값 미만
  lowSample: boolean;                  // 어느 한쪽이라도 시도 수 부족
}

export interface FindingRow {
  key: string;
  title: string;
  atlasId: string;
  severity: Finding['severity'];
  lowSample: boolean;                  // 해당 기법이 저표본이면 이 finding도 재확인 대상
}

export interface FindingDelta {
  solved: FindingRow[];                // 이전에만 있던 것(사라짐)
  added: FindingRow[];                 // 이번에만 있는 것
  persisted: FindingRow[];             // 양쪽 모두 있는 것
}

export type Tone = 'plain' | 'accent' | 'warn' | 'danger' | 'muted';
export interface SummarySegment {
  text: string;
  tone: Tone;
}

/**
 * heatmap 셀(objective 단위)을 ATLAS 기법 단위로 합친다.
 *
 * 같은 기법이 여러 objective로 잡히면 위험한 쪽(breached 우선)으로 상태를 합치고,
 * score는 최대값, attempts는 합계로 둔다(백엔드 _technique_status와 같은 규칙).
 * 미측정(untested)은 비교 기준이 될 수 없어 제외한다.
 */
function mergeTechniques(cells: HeatmapTechnique[]): Map<string, TechSide & { name: string }> {
  const out = new Map<string, TechSide & { name: string }>();
  for (const c of cells) {
    if (c.status === 'untested') continue;
    const status: TechStatus = c.status === 'breached' ? 'breached' : 'safe';
    const prev = out.get(c.atlas_technique_id);
    if (!prev) {
      out.set(c.atlas_technique_id, {
        name: c.name || c.atlas_technique_id,
        status,
        score: c.best_score ?? 0,
        attempts: c.attempts ?? 0,
      });
      continue;
    }
    if (status === 'breached') prev.status = 'breached';
    prev.score = Math.max(prev.score, c.best_score ?? 0);
    prev.attempts += c.attempts ?? 0;
  }
  return out;
}

/** before/after 상태 조합 → 버킷. before가 없으면(신규 측정) 돌파일 때만 후퇴·신규로 본다. */
function bucketOf(before: TechStatus | null, after: TechStatus): Bucket {
  if (before === null) return after === 'breached' ? 'regressed' : 'kept';
  if (before === 'breached') return after === 'breached' ? 'persisted' : 'improved';
  return after === 'breached' ? 'regressed' : 'kept';
}

/**
 * 두 스캔의 heatmap을 기법 단위로 비교해 버킷·변화폭·노이즈 경고까지 계산한다(§2).
 *
 * 현재 스캔에서 측정되지 않은 기법은 비교가 불가능하므로 결과에서 빠진다.
 * 정렬은 사용자가 조치할 순서(잔존 → 후퇴·신규 → 개선 → 유지), 같은 버킷 안에서는
 * 변화 폭이 큰 것부터.
 */
export function compareTechniques(
  prevCells: HeatmapTechnique[],
  curCells: HeatmapTechnique[],
): TechRow[] {
  const prev = mergeTechniques(prevCells);
  const cur = mergeTechniques(curCells);
  const rows: TechRow[] = [];
  for (const [atlasId, c] of cur) {
    const p = prev.get(atlasId) ?? null;
    const before: TechSide | null = p
      ? { status: p.status, score: p.score, attempts: p.attempts }
      : null;
    const after: TechSide = { status: c.status, score: c.score, attempts: c.attempts };
    const delta = before ? after.score - before.score : 0;
    rows.push({
      atlasId,
      name: c.name,
      before,
      after,
      bucket: bucketOf(before?.status ?? null, after.status),
      delta,
      negligible: before != null && Math.abs(delta) < NEGLIGIBLE_DELTA,
      lowSample:
        after.attempts < LOW_SAMPLE_ATTEMPTS ||
        (before != null && before.attempts < LOW_SAMPLE_ATTEMPTS),
    });
  }
  const order: Record<Bucket, number> = { persisted: 0, regressed: 1, improved: 2, kept: 3 };
  rows.sort((a, b) =>
    order[a.bucket] - order[b.bucket] || Math.abs(b.delta) - Math.abs(a.delta));
  return rows;
}

/** 심각도 정렬용 가중치 — 같은 기법에 여러 finding이 묶일 때 대표를 고르는 데 쓴다. */
const SEVERITY_RANK: Record<Finding['severity'], number> = {
  critical: 3, high: 2, medium: 1, low: 0,
};

/**
 * 스캔이 달라도 같은 취약점을 가리키도록 기법+제목을 키로 쓴다.
 *
 * findings_id는 스캔마다 새로 발급돼 두 스캔을 잇는 키가 될 수 없다(그걸 키로 쓰면
 * 모든 항목이 "사라짐+신규"로만 잡히고 "잔존"이 영영 나오지 않는다). 백엔드가 title을
 * technique_name으로 채우므로 이 키는 사실상 기법 단위이고, 그래서 §3은 finding 건수가
 * 아니라 **기법 단위 집계**다(화면에도 그렇게 표기한다).
 */
function findingKey(f: Finding): string {
  return `${f.atlas_technique_id}||${f.title}`;
}

function toFindingRow(f: Finding, lowSampleIds: Set<string>): FindingRow {
  return {
    key: findingKey(f),
    title: f.title,
    atlasId: f.atlas_technique_id,
    severity: f.severity,
    lowSample: lowSampleIds.has(f.atlas_technique_id),
  };
}

/**
 * 두 스캔의 findings를 대조해 해결/신규/잔존으로 나눈다(§3, 기법 단위).
 *
 * techRows의 저표본 기법에 걸린 finding은 lowSample로 표시해 "재확인 권장" 문구를 띄운다.
 * 같은 키가 한 스캔에 여러 건이면 가장 심각한 것을 대표로 남긴다 — 첫 건을 쓰면 critical이
 * medium 뒤에 묻혀 심각도가 실제보다 낮게 보일 수 있다.
 */
export function compareFindings(
  prevFindings: Finding[],
  curFindings: Finding[],
  techRows: TechRow[],
): FindingDelta {
  const lowSampleIds = new Set(techRows.filter(r => r.lowSample).map(r => r.atlasId));
  const dedupe = (list: Finding[]) => {
    const m = new Map<string, Finding>();
    for (const f of list) {
      const key = findingKey(f);
      const cur = m.get(key);
      if (!cur || SEVERITY_RANK[f.severity] > SEVERITY_RANK[cur.severity]) m.set(key, f);
    }
    return m;
  };
  const prev = dedupe(prevFindings);
  const cur = dedupe(curFindings);
  const solved: FindingRow[] = [];
  const added: FindingRow[] = [];
  const persisted: FindingRow[] = [];
  for (const [key, f] of prev) {
    if (!cur.has(key)) solved.push(toFindingRow(f, lowSampleIds));
  }
  for (const [key, f] of cur) {
    (prev.has(key) ? persisted : added).push(toFindingRow(f, lowSampleIds));
  }
  return { solved, added, persisted };
}

/** 이름 목록 → "A, B 외 2건" 형태의 짧은 문구. */
function nameList(rows: TechRow[]): string {
  const names = rows.map(r => r.name);
  if (names.length <= NAME_LIST_MAX) return names.join(', ');
  return `${names.slice(0, NAME_LIST_MAX).join(', ')} 외 ${names.length - NAME_LIST_MAX}건`;
}

/**
 * 위험도가 이만큼은 움직여야 "전반적 개선/후퇴"로 단정한다.
 *
 * 상단 배지(overallVerdict)와 §5 요약(buildComparisonSummary)이 같은 값을 써야 한다 —
 * 기준이 어긋나면 배지는 "큰 변화 없음"인데 요약은 "위험도 상승"이라고 말하는 모순이 생긴다.
 */
export const RISK_VERDICT_DELTA = 5;

/** 위험도 변화 → 상단 비교 바의 종합 판정. 변화 폭이 작으면 단정하지 않는다. */
export function overallVerdict(riskDelta: number): { text: string; tone: Tone } {
  if (riskDelta <= -RISK_VERDICT_DELTA) return { text: '▼ 전반적 개선', tone: 'accent' };
  if (riskDelta >= RISK_VERDICT_DELTA) return { text: '▲ 전반적 후퇴', tone: 'danger' };
  return { text: '— 큰 변화 없음', tone: 'muted' };
}

/**
 * §5 비교 요약 — 계산된 델타로 서술을 조립한다(LLM 호출 없음).
 *
 * 색만 다른 문장 조각 배열로 돌려주고 렌더는 React가 escape하게 둔다(innerHTML 미사용).
 * 인과를 단정하지 않도록 마지막에 관측 한계 각주를 항상 붙인다.
 */
export function buildComparisonSummary(
  prev: ScanHistoryItem,
  cur: ScanHistoryItem,
  rows: TechRow[],
): SummarySegment[] {
  const riskDelta = (cur.risk_score ?? 0) - (prev.risk_score ?? 0);
  const seg: SummarySegment[] = [{ text: `지난 스캔(#${prev.scan_id}) 대비 `, tone: 'plain' }];

  if (Math.abs(riskDelta) < RISK_VERDICT_DELTA) {
    seg.push({ text: '종합 위험도는 사실상 그대로입니다', tone: 'muted' });
  } else {
    const dir = riskDelta < 0 ? '하락' : '상승';
    seg.push({
      text: `종합 위험도가 ${Math.abs(Math.round(riskDelta))}p ${dir}`,
      tone: riskDelta < 0 ? 'accent' : 'danger',
    });
    seg.push({ text: `(${prev.risk_score ?? 0} → ${cur.risk_score ?? 0})했습니다`, tone: 'plain' });
  }
  seg.push({ text: '. ', tone: 'plain' });

  const improved = rows.filter(r => r.bucket === 'improved');
  if (improved.length) {
    seg.push({ text: `${nameList(improved)}이(가) 돌파에서 방어로 전환`, tone: 'accent' });
    seg.push({ text: '된 것으로 관측됩니다. ', tone: 'plain' });
  }

  const persisted = rows.filter(r => r.bucket === 'persisted');
  if (persisted.length) {
    seg.push({ text: '다만 ', tone: 'plain' });
    seg.push({ text: `${nameList(persisted)}은(는) 여전히 돌파 상태`, tone: 'danger' });
    seg.push({ text: '로 남아 최우선 조치 대상입니다. ', tone: 'plain' });
  }

  const regressed = rows.filter(r => r.bucket === 'regressed');
  if (regressed.length) {
    seg.push({ text: `${nameList(regressed)}은(는) 이번에 새로 돌파됐습니다. `, tone: 'warn' });
    if (regressed.some(r => r.lowSample)) {
      seg.push({
        text: '이 중 일부는 시도 표본이 적어 노이즈일 가능성이 있으므로 재확인을 권장합니다. ',
        tone: 'warn',
      });
    }
  }

  if (!improved.length && !persisted.length && !regressed.length) {
    seg.push({ text: '기법별 판정에는 눈에 띄는 변화가 없습니다. ', tone: 'muted' });
  }
  seg.push({
    text: '두 스캔은 동일 조건의 재현 실험이 아니므로, 위 내용은 인과가 아닌 관측된 변화입니다.',
    tone: 'muted',
  });
  return seg;
}
