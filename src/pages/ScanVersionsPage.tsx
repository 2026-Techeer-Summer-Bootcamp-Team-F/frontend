import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  getScanHistory,
  getVersionDiff,
  type ScanHistory,
  type ScanHistoryItem,
  type VersionDiff,
  type TechniqueSide,
  type TechniqueVerdict,
  type DiffFile,
  type DiffLine,
} from '../api/versions';
import styles from './ScanVersionsPage.module.css';

const shortSha = (sha: string | null) => (sha ? sha.slice(0, 7) : '—');

/** 판정 side(돌파/방어 + score) → 표시 문자열. */
function sideLabel(side: TechniqueSide | null): string {
  if (!side) return '—';
  return `${side.status === 'breached' ? '돌파' : '방어'} · ${side.score.toFixed(2)}`;
}

const VERDICT_TEXT: Record<TechniqueVerdict['verdict'], string> = {
  solved: '✓ 해결됨',
  open: '미해결',
  keep: '유지',
  regressed: '⚠ 후퇴',
};
// regressed는 open과 같은 빨강 스타일 재사용(목업 3종 + 후퇴).
const VERDICT_CLASS: Record<TechniqueVerdict['verdict'], string> = {
  solved: styles.solved,
  open: styles.open,
  keep: styles.keep,
  regressed: styles.open,
};

/** 파일 탭의 종류 뱃지(NEW/±/DEL). */
function fileTag(kind: DiffFile['kind']) {
  if (kind === 'new') return <span className={`${styles.st} ${styles.new}`}>NEW</span>;
  if (kind === 'del') return <span className={`${styles.st} ${styles.del}`}>DEL</span>;
  return <span className={`${styles.st} ${styles.add}`}>±</span>;
}

/** diff 한 컬럼(이전/현재) 렌더 — 줄 배열이 null이면 폴백 문구. 내용은 React가 이스케이프. */
function DiffColumn({ lines, fallback }: { lines: DiffLine[] | null; fallback: string }) {
  if (!lines) return <div className={styles.emptydiff}>{fallback}</div>;
  return (
    <>
      {lines.map((l, i) => (
        <div key={i} className={`${styles.cl} ${l.t ? styles[l.t] : ''}`}>
          <span className={styles.ln}>{l.n || ''}</span>
          <span>{l.c}</span>
        </div>
      ))}
    </>
  );
}

export function ScanVersionsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const targetId = Number(projectId);

  const [history, setHistory] = useState<ScanHistory | null>(null);
  const [historyError, setHistoryError] = useState(false);
  const [selScanId, setSelScanId] = useState<number | null>(null);

  const [diff, setDiff] = useState<VersionDiff | null>(null);
  const [diffLoading, setDiffLoading] = useState(false);
  const [diffError, setDiffError] = useState(false);
  const [selVerdict, setSelVerdict] = useState(0);
  const [selFile, setSelFile] = useState(0);

  // 이력 로드 → 최신 스캔 자동 선택.
  useEffect(() => {
    if (!targetId) return;
    let alive = true;
    getScanHistory(targetId)
      .then(h => {
        if (!alive) return;
        setHistory(h);
        setSelScanId(h.scans[0]?.scan_id ?? null);
      })
      .catch(() => { if (alive) setHistoryError(true); });
    return () => { alive = false; };
  }, [targetId]);

  // 선택 스캔 → 버전 비교 로드.
  useEffect(() => {
    if (selScanId == null) return;
    let alive = true;
    setDiffLoading(true);
    setDiffError(false);
    setSelVerdict(0);
    setSelFile(0);
    getVersionDiff(selScanId)
      .then(d => { if (alive) setDiff(d); })
      .catch(() => { if (alive) { setDiff(null); setDiffError(true); } })
      .finally(() => { if (alive) setDiffLoading(false); });
    return () => { alive = false; };
  }, [selScanId]);

  const scans = history?.scans ?? [];
  const files = diff?.files ?? [];
  const results = diff?.results ?? [];
  const curFile: DiffFile | undefined = files[selFile];
  const selResult: TechniqueVerdict | undefined = results[selVerdict];

  // 결과 요약 문장(백엔드는 요약을 안 주므로 클라에서 파생).
  const summary = useMemo(() => {
    if (!diff || diff.baseline) return null;
    const n = (v: TechniqueVerdict['verdict']) => results.filter(r => r.verdict === v).length;
    return { solved: n('solved'), regressed: n('regressed'), open: n('open'), keep: n('keep') };
  }, [diff, results]);

  if (historyError) {
    return (
      <div className={styles.page}>
        <div className={styles.state}>스캔 이력을 불러오지 못했습니다.</div>
      </div>
    );
  }

  const projName = history?.project_name ?? '';
  const curScan: ScanHistoryItem | undefined = scans.find(s => s.scan_id === selScanId);

  return (
    <div className={styles.page}>
      {/* ── 헤더 ── */}
      <div className={styles.phead}>
        <p className={styles.ey}>Scan Version Control</p>
        <h1 className={styles.title}>
          스캔 버전 관리 {projName && <span className={styles.proj}>{projName}</span>}
        </h1>
        <p className={styles.sub}>
          좌측에서 스캔 시기를 고르고, 아래 결과에서 취약점을 클릭하면 위 코드 변경점이 전환됩니다.
        </p>
      </div>

      <div className={styles.layout}>
        {/* ── 좌: 스캔 이력 ── */}
        <div className={styles.panel}>
          <div className={styles.ptitle}>
            <span className={`${styles.dot} ${styles.dg}`} />
            <span className={`${styles.dot} ${styles.dy}`} />
            <span className={`${styles.dot} ${styles.dgr}`} />
            <span className={styles.lab}>스캔 이력</span>
            <span className={styles.rt}>{scans.length} scans</span>
          </div>
          <div className={styles.scanlist}>
            {!history && <div className={styles.state}><span className={styles.blink}>█</span> 불러오는 중...</div>}
            {history && scans.length === 0 && <div className={styles.state}>스캔 이력이 없습니다.</div>}
            {scans.map(s => {
              const isBreach = s.breach_count > 0;
              const isSel = s.scan_id === selScanId;
              return (
                <button
                  key={s.scan_id}
                  type="button"
                  className={`${styles.srow} ${isBreach ? styles.breach : ''} ${isSel ? styles.sel : ''}`}
                  onClick={() => setSelScanId(s.scan_id)}
                >
                  <span className={styles.node} />
                  <div className={styles.cap}>
                    <div className={styles.v}>
                      #{s.scan_id}<span className={styles.tag}>{shortSha(s.commit_sha)}</span>
                    </div>
                    <div className={styles.d}>{s.date ?? '—'} · {s.defended}/{s.total_objectives} defended</div>
                  </div>
                  <div className={styles.rb}>
                    <span className={`${styles.badge} ${isBreach ? styles.br : styles.ok}`}>
                      {isBreach ? `${s.breach_count} breach` : '0 breach'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── 우 ── */}
        <div className={styles.right}>
          {/* 우상: diff */}
          <div className={styles.panel}>
            <div className={styles.diffhead}>
              <span className={styles.tech}>
                {selResult ? `${selResult.atlas_technique_id} · ${selResult.name}` : '전체 변경 파일'}
              </span>
              <span className={styles.rt}>
                {diff && !diff.baseline ? `${shortSha(diff.base_sha)} → ${shortSha(diff.head_sha)}` : ''}
              </span>
            </div>

            {files.length > 0 && (
              <div className={styles.ftabs}>
                {files.map((f, i) => (
                  <button
                    key={f.path}
                    type="button"
                    className={`${styles.ftab} ${i === selFile ? styles.on : ''}`}
                    onClick={() => setSelFile(i)}
                  >
                    {f.path.split('/').pop()}
                    {fileTag(f.kind)}
                  </button>
                ))}
              </div>
            )}

            <div>
              {diffLoading && <div className={styles.emptydiff}><span className={styles.blink}>█</span> diff 불러오는 중...</div>}
              {!diffLoading && (diffError || diff?.baseline || files.length === 0) && (
                <div className={styles.emptydiff}>
                  {diffError
                    ? '코드 변경점을 불러오지 못했습니다.'
                    : diff?.baseline
                      ? '표시할 코드 변경점이 없습니다. (최초 스캔)'
                      : diff?.diff_error ?? '표시할 코드 변경점이 없습니다.'}
                </div>
              )}
              {!diffLoading && !diffError && curFile && (
                <div className={styles.cols}>
                  <div className={styles.col}>
                    <div className={styles.colh}>
                      <span className={styles.k}>이전</span> · {shortSha(diff?.base_sha ?? null)} · {curFile.path}
                    </div>
                    <div className={styles.code}>
                      <DiffColumn lines={curFile.before} fallback="신규 파일 — 이전 버전 없음" />
                    </div>
                  </div>
                  <div className={styles.col}>
                    <div className={styles.colh}>
                      <span className={styles.k}>현재</span> · {shortSha(diff?.head_sha ?? null)} — 선택됨
                    </div>
                    <div className={styles.code}>
                      <DiffColumn lines={curFile.after} fallback="삭제된 파일" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 우하: 결과 */}
          <div className={styles.panel}>
            <div className={styles.ptitle}>
              <span className={styles.lab} style={{ color: '#cfe6d8' }}>결과 · 취약점 해결 여부</span>
              <span className={styles.rt}>
                {curScan && (diff?.base_scan_id != null ? `#${diff.base_scan_id} → #${curScan.scan_id}` : `#${curScan.scan_id}`)}
              </span>
            </div>
            <div className={styles.hintline}>↓ 행을 클릭하면 위 코드 변경점 헤더가 해당 취약점으로 바뀝니다.</div>
            <div>
              {diff?.baseline && (
                <div className={styles.emptydiff}>최초 스캔이라 비교할 이전 버전이 없습니다.</div>
              )}
              {!diff?.baseline && results.length === 0 && !diffLoading && (
                <div className={styles.emptydiff}>판정 변화로 표시할 기법이 없습니다.</div>
              )}
              {!diff?.baseline && results.map((v, i) => (
                <button
                  key={v.atlas_technique_id}
                  type="button"
                  className={`${styles.resitem} ${i === selVerdict ? styles.sel : ''}`}
                  onClick={() => setSelVerdict(i)}
                >
                  <div className={styles.tname}>
                    <div className={styles.t}>{v.name}</div>
                    <div className={styles.id}>{v.atlas_technique_id}</div>
                  </div>
                  <div className={styles.flow}>
                    <span className={v.before?.status === 'breached' ? styles.before : styles.after}>
                      {sideLabel(v.before)}
                    </span>
                    <span className={styles.arrow}>→</span>
                    <span className={v.after.status === 'breached' ? styles.before : styles.after}>
                      {sideLabel(v.after)}
                    </span>
                  </div>
                  <div className={styles.verdict}>
                    <span className={`${styles.rv} ${VERDICT_CLASS[v.verdict]}`}>{VERDICT_TEXT[v.verdict]}</span>
                  </div>
                </button>
              ))}
            </div>
            {summary && (
              <div className={styles.ressum}>
                이번 스캔에서 <b>해결 {summary.solved}건</b>
                {summary.regressed > 0 && <> · <span className={styles.danger}>후퇴 {summary.regressed}건</span></>}
                {' '}· 미해결 {summary.open}건 · 유지 {summary.keep}건
                {curScan && <> — 커버리지 {curScan.defended}/{curScan.total_objectives} 방어.</>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
