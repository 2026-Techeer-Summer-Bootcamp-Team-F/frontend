import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getScanHistory, type ScanHistory, type ScanHistoryItem } from '../api/versions';
import { getScanFindings, getScanHeatmap, type Finding, type HeatmapTechnique } from '../api/scans';
import {
  buildComparisonSummary,
  compareFindings,
  compareTechniques,
  overallVerdict,
  type Bucket,
  type FindingDelta,
  type FindingRow,
  type SummarySegment,
  type TechRow,
  type TechSide,
} from '../utils/compareScans';
import styles from './ScanVersionsPage.module.css';

/** §4 추세에 표시할 최근 스캔 개수. */
const TREND_LIMIT = 5;

const shortSha = (sha: string | null) => (sha ? sha.slice(0, 7) : '—');

/** 스캔 셀렉터 옵션 라벨 — "#112 · 2026-07-17 · 4b8c091". */
const scanLabel = (s: ScanHistoryItem) =>
  `#${s.scan_id} · ${s.date ?? '날짜 없음'} · ${shortSha(s.commit_sha)}`;

const BUCKET_META: Record<Bucket, { head: string; cls: string }> = {
  improved: { head: '✅ 개선 (돌파 → 방어)', cls: styles.imp },
  persisted: { head: '⛔ 잔존 (여전히 돌파)', cls: styles.stay },
  regressed: { head: '⚠️ 후퇴 / 신규 (방어 → 돌파)', cls: styles.reg },
  kept: { head: '— 유지 (방어 유지)', cls: styles.keep },
};
const BUCKET_ORDER: Bucket[] = ['improved', 'persisted', 'regressed', 'kept'];

const TONE_CLASS: Record<SummarySegment['tone'], string> = {
  plain: '',
  accent: styles.tAccent,
  warn: styles.tWarn,
  danger: styles.tDanger,
  muted: styles.tMuted,
};

/** 비교에 쓸 한쪽 스캔의 원본 데이터 묶음. */
interface ScanSide {
  cells: HeatmapTechnique[];
  findings: Finding[];
}

/** 한 스캔의 heatmap·findings를 함께 가져온다. 둘 중 하나만 실패해도 비교가 불가능하다. */
async function loadSide(scanId: number): Promise<ScanSide> {
  const [heat, findings] = await Promise.all([
    getScanHeatmap(scanId),
    getScanFindings(scanId),
  ]);
  return { cells: heat.techniques, findings };
}

/** 기법 한쪽(이전/현재)의 "돌파 0.91" 표기. */
function SideFlow({ side }: { side: TechSide | null }) {
  if (!side) return <span className={styles.na}>미측정</span>;
  const breached = side.status === 'breached';
  return (
    <span className={breached ? styles.br : styles.df}>
      {breached ? '돌파' : '방어'} {side.score.toFixed(2)}
    </span>
  );
}

/** §1 KPI 카드 — before→after와 증감 뱃지. good=true면 초록, false면 빨강. */
function StatCard(
  { label, before, after, delta, good }:
  { label: string; before: string; after: string; delta: string; good: boolean | null },
) {
  const tone = good === null ? styles.flat : good ? styles.good : styles.bad;
  return (
    <div className={styles.stat}>
      <div className={styles.statKey}>{label}</div>
      <div className={styles.statRow}>
        <span className={styles.statBefore}>{before}</span>
        <span className={styles.statArrow}>→</span>
        <span className={`${styles.statAfter} ${tone}`}>{after}</span>
      </div>
      <span className={`${styles.statDelta} ${tone}`}>{delta}</span>
    </div>
  );
}

/** §3 Finding 델타 카드 한 장(해결/신규/잔존). */
function FindingCard(
  { title, cls, rows }: { title: string; cls: string; rows: FindingRow[] },
) {
  return (
    <div className={`${styles.fcard} ${cls}`}>
      <div className={styles.fh}>{title}<span className={styles.fcount}>{rows.length}</span></div>
      {rows.length === 0 && <div className={styles.fempty}>해당 없음</div>}
      {rows.map(f => (
        <div key={f.key} className={styles.fitem}>
          <div className={styles.ft}>{f.title}</div>
          <div className={styles.fid}>
            {f.atlasId || '기법 미상'}
            {f.severity === 'critical' && ' · CRITICAL'}
            {f.lowSample && ' · 노이즈 가능'}
          </div>
        </div>
      ))}
    </div>
  );
}

/** §4 추세 스파크라인 — 값 배열을 0~max로 정규화해 폴리라인으로 그린다. */
function Sparkline({ points }: { points: { scanId: number; value: number }[] }) {
  const W = 520;
  const H = 90;
  const max = Math.max(1, ...points.map(p => p.value));
  const step = points.length > 1 ? (W - 60) / (points.length - 1) : 0;
  const xy = points.map((p, i) => ({
    x: 20 + i * step,
    y: 20 + (1 - p.value / max) * 46,
    ...p,
  }));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" height={H} role="img"
         aria-label="최근 스캔 위험도 추세">
      <line x1="0" y1="70" x2={W} y2="70" stroke="rgba(255,255,255,.08)" />
      <polyline points={xy.map(p => `${p.x},${p.y}`).join(' ')} fill="none"
                stroke="var(--accent)" strokeWidth="2" />
      {xy.map((p, i) => (
        <circle key={p.scanId} cx={p.x} cy={p.y} r={i === xy.length - 1 ? 5 : 4}
                fill="var(--accent)" />
      ))}
      {/* 양 끝 라벨은 가운데 정렬하면 뷰박스 밖으로 잘리므로 안쪽으로 붙인다. */}
      {xy.map((p, i) => (
        <text key={p.scanId} x={p.x} y="86"
              textAnchor={i === 0 ? 'start' : i === xy.length - 1 ? 'end' : 'middle'}
              fill="var(--text-muted)" fontSize="11" fontFamily="var(--font-ui)">
          #{p.scanId} · {p.value}
        </text>
      ))}
    </svg>
  );
}

export function ScanVersionsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const targetId = Number(projectId);

  const [history, setHistory] = useState<ScanHistory | null>(null);
  const [historyError, setHistoryError] = useState(false);
  const [prevId, setPrevId] = useState<number | null>(null);
  const [curId, setCurId] = useState<number | null>(null);

  const [sides, setSides] = useState<{ prev: ScanSide; cur: ScanSide } | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);

  // 이력 로드 → 최신 done 스캔을 현재, 그 직전을 이전으로 기본 선택.
  useEffect(() => {
    setHistory(null);
    setHistoryError(false);
    setPrevId(null);
    setCurId(null);
    setSides(null);
    if (!targetId) return;
    let alive = true;
    getScanHistory(targetId)
      .then(h => {
        if (!alive) return;
        setHistory(h);
        const done = h.scans.filter(s => s.status === 'done');
        setCurId(done[0]?.scan_id ?? null);
        setPrevId(done[1]?.scan_id ?? null);
      })
      .catch(() => { if (alive) setHistoryError(true); });
    return () => { alive = false; };
  }, [targetId]);

  // 선택된 두 스캔의 heatmap·findings 로드. 한쪽이라도 없으면 비교하지 않는다.
  useEffect(() => {
    if (prevId == null || curId == null || prevId === curId) {
      setSides(null);
      return;
    }
    let alive = true;
    setSides(null);
    setLoading(true);
    setLoadError(false);
    Promise.all([loadSide(prevId), loadSide(curId)])
      .then(([prev, cur]) => { if (alive) setSides({ prev, cur }); })
      .catch(() => { if (alive) { setSides(null); setLoadError(true); } })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [prevId, curId]);

  const doneScans = useMemo(
    () => (history?.scans ?? []).filter(s => s.status === 'done'),
    [history],
  );
  const prevMeta = doneScans.find(s => s.scan_id === prevId) ?? null;
  const curMeta = doneScans.find(s => s.scan_id === curId) ?? null;

  const techRows: TechRow[] = useMemo(
    () => (sides ? compareTechniques(sides.prev.cells, sides.cur.cells) : []),
    [sides],
  );
  const findingDelta: FindingDelta | null = useMemo(
    () => (sides ? compareFindings(sides.prev.findings, sides.cur.findings, techRows) : null),
    [sides, techRows],
  );
  const summary = useMemo(
    () => (prevMeta && curMeta && sides ? buildComparisonSummary(prevMeta, curMeta, techRows) : null),
    [prevMeta, curMeta, sides, techRows],
  );

  // §4 추세: 최근 TREND_LIMIT개 done 스캔을 과거→현재 순으로.
  const trend = useMemo(
    () => doneScans.slice(0, TREND_LIMIT).slice().reverse(),
    [doneScans],
  );

  const projName = history?.project_name ?? '';
  const canCompare = prevMeta != null && curMeta != null;
  const riskDelta = canCompare ? (curMeta.risk_score ?? 0) - (prevMeta.risk_score ?? 0) : 0;
  const verdict = overallVerdict(riskDelta);

  if (historyError) {
    return (
      <div className={styles.page}>
        <div className={styles.state}>스캔 이력을 불러오지 못했습니다.</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <p className={styles.ey}>Scan Version Control</p>
      <h1 className={styles.title}>
        스캔 버전 관리 {projName && <span className={styles.proj}>{projName}</span>}
      </h1>

      {/* ── 비교 바 ── */}
      <div className={styles.cmpbar}>
        <div className={styles.slot}>
          <span className={styles.slotKey}>이전 스캔</span>
          <select
            className={styles.pick}
            value={prevId ?? ''}
            onChange={e => setPrevId(Number(e.target.value))}
            disabled={doneScans.length < 2}
            aria-label="이전 스캔 선택"
          >
            {doneScans.length < 2 && <option value="">비교 대상 없음</option>}
            {doneScans.map(s => (
              <option key={s.scan_id} value={s.scan_id}>{scanLabel(s)}</option>
            ))}
          </select>
        </div>
        <span className={styles.arrow}>→</span>
        <div className={styles.slot}>
          <span className={styles.slotKey}>현재 스캔</span>
          <select
            className={styles.pick}
            value={curId ?? ''}
            onChange={e => setCurId(Number(e.target.value))}
            disabled={doneScans.length === 0}
            aria-label="현재 스캔 선택"
          >
            {doneScans.length === 0 && <option value="">완료된 스캔 없음</option>}
            {doneScans.map(s => (
              <option key={s.scan_id} value={s.scan_id}>{scanLabel(s)}</option>
            ))}
          </select>
        </div>
        {canCompare && sides && (
          <span className={`${styles.verdict} ${TONE_CLASS[verdict.tone]}`}>{verdict.text}</span>
        )}
      </div>

      {/* 각 스캔의 전체 리포트로 가는 링크(경로 유지) */}
      <div className={styles.reportlinks}>
        {prevMeta && (
          <Link to={`/report/${prevMeta.scan_id}`} className={styles.rlink}>
            이전 스캔 리포트 #{prevMeta.scan_id} →
          </Link>
        )}
        {curMeta && (
          <Link to={`/report/${curMeta.scan_id}`} className={styles.rlink}>
            현재 스캔 리포트 #{curMeta.scan_id} →
          </Link>
        )}
      </div>

      {/* ── 빈 상태 / 로딩 / 실패 ── */}
      {!history && <div className={styles.state}>불러오는 중...</div>}
      {history && doneScans.length === 0 && (
        <div className={styles.state}>완료된 스캔이 없어 비교할 수 없습니다.</div>
      )}
      {history && doneScans.length === 1 && (
        <div className={styles.state}>
          완료된 스캔이 1개뿐이라 비교할 이전 스캔이 없습니다. 다시 스캔한 뒤 확인해 주세요.
        </div>
      )}
      {canCompare && prevId === curId && (
        <div className={styles.state}>같은 스캔끼리는 비교할 수 없습니다. 다른 스캔을 골라 주세요.</div>
      )}
      {loading && <div className={styles.state}>비교 데이터를 불러오는 중...</div>}
      {loadError && (
        <div className={styles.state}>비교 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</div>
      )}

      {canCompare && sides && findingDelta && (
        <>
          {/* ── §1 종합 델타 ── */}
          <div className={styles.sec}>
            <div className={styles.sh}>
              <span className={styles.secNo}>§1</span><h2>종합 델타</h2>
              <span className={styles.secR}>#{prevMeta.scan_id} → #{curMeta.scan_id}</span>
            </div>
            <div className={styles.kpi}>
              <StatCard
                label="종합 위험도"
                before={String(prevMeta.risk_score ?? 0)}
                after={String(curMeta.risk_score ?? 0)}
                delta={deltaText(riskDelta, '개선', '악화')}
                good={signGood(riskDelta)}
              />
              <StatCard
                label="돌파 건수"
                before={String(prevMeta.breach_count)}
                after={String(curMeta.breach_count)}
                delta={deltaText(curMeta.breach_count - prevMeta.breach_count, '개선', '악화')}
                good={signGood(curMeta.breach_count - prevMeta.breach_count)}
              />
              <StatCard
                label="커버리지"
                before={`${prevMeta.defended}/${prevMeta.total_objectives}`}
                after={`${curMeta.defended}/${curMeta.total_objectives}`}
                delta={coverageDeltaText(curMeta.defended - prevMeta.defended)}
                good={curMeta.defended === prevMeta.defended
                  ? null : curMeta.defended > prevMeta.defended}
              />
              <StatCard
                label="Critical"
                before={String(prevMeta.critical_count ?? 0)}
                after={String(curMeta.critical_count ?? 0)}
                delta={deltaText((curMeta.critical_count ?? 0) - (prevMeta.critical_count ?? 0), '개선', '악화')}
                good={signGood((curMeta.critical_count ?? 0) - (prevMeta.critical_count ?? 0))}
              />
            </div>
          </div>

          {/* ── §2 기법별 변화 ── */}
          <div className={styles.sec}>
            <div className={styles.sh}>
              <span className={styles.secNo}>§2</span><h2>기법별 변화</h2>
              <span className={styles.secR}>best fitness · 이전 → 현재</span>
            </div>
            {techRows.length === 0 && (
              <div className={styles.state}>양쪽에서 측정된 기법이 없어 비교할 수 없습니다.</div>
            )}
            {BUCKET_ORDER.map(b => {
              const rows = techRows.filter(r => r.bucket === b);
              if (rows.length === 0) return null;
              const meta = BUCKET_META[b];
              return (
                <div key={b} className={styles.bucket}>
                  <div className={`${styles.bh} ${meta.cls}`}>
                    {meta.head}
                    <span className={styles.cnt}>{rows.length} techniques</span>
                  </div>
                  {rows.map(r => (
                    <div key={r.atlasId} className={styles.trow}>
                      <div className={styles.techName}>
                        <div className={styles.techTitle}>{r.name}</div>
                        <div className={styles.techId}>{r.atlasId}</div>
                      </div>
                      <div className={styles.flow}>
                        <SideFlow side={r.before} />
                        <span className={styles.flowArrow}>→</span>
                        <SideFlow side={r.after} />
                      </div>
                      {r.lowSample ? (
                        <span className={styles.note}>
                          ⚠ 표본 적음(시도 {r.before?.attempts ?? 0}→{r.after.attempts}) · 노이즈 가능 · 재확인 권장
                        </span>
                      ) : r.negligible ? (
                        <span className={styles.keepnote}>
                          {r.bucket === 'persisted' ? '변화 폭 작음 · 최우선 조치' : '사실상 변화 없음'}
                        </span>
                      ) : null}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          {/* ── §3 Finding 델타 ── */}
          <div className={styles.sec}>
            <div className={styles.sh}>
              <span className={styles.secNo}>§3</span><h2>Finding 델타</h2>
              <span className={styles.secR}>이전 대비 · 기법 단위</span>
            </div>
            <div className={styles.fcols}>
              <FindingCard title="✓ 사라짐" cls={styles.solved} rows={findingDelta.solved} />
              <FindingCard title="+ 신규" cls={styles.newf} rows={findingDelta.added} />
              <FindingCard title="! 잔존" cls={styles.persist} rows={findingDelta.persisted} />
            </div>
          </div>

          {/* ── §4 추세 ── */}
          <div className={styles.sec}>
            <div className={styles.sh}>
              <span className={styles.secNo}>§4</span><h2>추세</h2>
              <span className={styles.secR}>최근 {trend.length} 스캔</span>
            </div>
            <div className={styles.trend}>
              <div className={styles.lg}>
                종합 위험도<br />
                <b>{trend.map(s => s.risk_score ?? 0).join(' → ')}</b>
              </div>
              <Sparkline
                points={trend.map(s => ({ scanId: s.scan_id, value: s.risk_score ?? 0 }))}
              />
              <div className={styles.lg}>
                돌파 건수<br />
                <b>{trend.map(s => s.breach_count).join(' → ')}</b>
              </div>
            </div>
          </div>

          {/* ── §5 비교 요약 ── */}
          <div className={styles.sec}>
            <div className={styles.sh}>
              <span className={styles.secNo}>§5</span><h2>비교 요약</h2>
              <span className={styles.secR}>관측된 변화</span>
            </div>
            <div className={styles.summary}>
              {summary?.map((s, i) => (
                <span key={i} className={TONE_CLASS[s.tone]}>{s.text}</span>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/** 증감 뱃지 문구 — 감소가 좋은 지표 기준(양수=악화). */
function deltaText(delta: number, goodWord: string, badWord: string): string {
  if (delta === 0) return '변화 없음';
  const rounded = Math.abs(Math.round(delta * 10) / 10);
  return delta < 0 ? `▼ ${rounded} · ${goodWord}` : `▲ ${rounded} · ${badWord}`;
}

/** 커버리지는 방어 기법이 늘수록 좋으므로 증감 방향이 반대다. */
function coverageDeltaText(delta: number): string {
  if (delta === 0) return '변화 없음';
  return delta > 0 ? `▲ ${delta} 기법` : `▼ ${Math.abs(delta)} 기법`;
}

/** 감소가 좋은 지표에서 색 결정. 0이면 중립(null). */
function signGood(delta: number): boolean | null {
  if (delta === 0) return null;
  return delta < 0;
}
