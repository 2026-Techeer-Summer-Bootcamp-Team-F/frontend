import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getScanReport,
  getScanHeatmap,
  getScanFindings,
  listScans,
  type ScanReport,
  type HeatmapTechnique,
  type Finding,
  type Scan,
} from '../api/scans';
import { MOCK_REPORT, MOCK_HEATMAP, MOCK_FINDINGS } from '../api/mock';
import styles from './ReportPage.module.css';

const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low'] as const;
const SEVERITY_COLOR: Record<string, string> = {
  critical: 'var(--red)',
  high: 'var(--orange)',
  medium: '#e0d252',
  low: 'var(--text-muted)',
};

export function ReportPage() {
  const { scanId } = useParams<{ scanId: string }>();
  const navigate = useNavigate();

  const [report, setReport] = useState<ScanReport | null>(null);
  const [heatmap, setHeatmap] = useState<HeatmapTechnique[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [pastScans, setPastScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedFindings, setExpandedFindings] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!scanId) return;
    const id = Number(scanId);
    Promise.all([
      getScanReport(id),
      getScanHeatmap(id),
      getScanFindings(id),
      listScans(),
    ])
      .then(([r, h, f, s]) => {
        setReport(r);
        setHeatmap(h.techniques);
        setFindings(f);
        setPastScans(s.filter(sc => sc.scan_id !== id).slice(0, 5));
      })
      .catch(() => {
        setReport(MOCK_REPORT);
        setHeatmap(MOCK_HEATMAP);
        setFindings(MOCK_FINDINGS);
        setPastScans([]);
      })
      .finally(() => setLoading(false));
  }, [scanId]);

  if (loading) return <LoadingState />;
  if (error) return <p className={styles.error}>{error}</p>;
  if (!report) return null;

  const sortedFindings = useMemo(
    () => [...findings].sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity)),
    [findings],
  );

  const toggleFinding = useCallback((id: number) => {
    setExpandedFindings(prev => {
      const next = new Set(prev);
      prev.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const breachedTechniques = heatmap.filter(t => t.status === 'breached');

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <p className={styles.label}>SCAN #{scanId} — REPORT</p>
        <h1 className={styles.title}>
          스캔 결과 <span className={styles.accent}>리포트</span>
        </h1>
      </div>

      {/* ── 4 Stat cards ── */}
      <div className={styles.statGrid}>
        <StatCard
          value={report.risk_score}
          label="위험도"
          color={report.risk_score >= 70 ? 'var(--red)' : report.risk_score >= 40 ? 'var(--orange)' : 'var(--accent)'}
          suffix="/100"
        />
        <StatCard value={report.stats.total_attempts} label="총 시도 수" />
        <StatCard
          value={report.stats.breached_attempts}
          label="침투 성공"
          color={report.stats.breached_attempts > 0 ? 'var(--red)' : 'var(--accent)'}
        />
        <StatCard value={report.stats.findings} label="취약점 수" />
      </div>

      {/* ── ATLAS Heatmap ── */}
      <section className={styles.card}>
        <p className={styles.cardLabel}>MITRE ATLAS 히트맵</p>
        <div className={styles.heatmapGrid}>
          {heatmap.map(t => (
            <div key={t.atlas_technique_id} className={`${styles.heatCell} ${styles[t.status]}`}>
              <span className={styles.heatId}>{t.atlas_technique_id.replace('AML.', '')}</span>
              <span className={styles.heatName}>{t.name}</span>
              <span className={styles.heatScore}>{(t.best_score * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
        <div className={styles.heatLegend}>
          <span className={`${styles.legendDot} ${styles.breached}`} /> 침투 성공
          <span className={`${styles.legendDot} ${styles.safe}`} /> 방어 성공
          <span className={`${styles.legendDot} ${styles.untested}`} /> 미테스트
        </div>
      </section>

      {/* ── Findings ── */}
      <section className={styles.card}>
        <p className={styles.cardLabel}>TOP FINDINGS ({findings.length})</p>
        {findings.length === 0 ? (
          <p className={styles.emptyMsg}>✓ 발견된 취약점 없음</p>
        ) : (
          <div className={styles.findingList}>
            {sortedFindings.map(f => {
                const isOpen = expandedFindings.has(f.findings_id);
                return (
                  <div key={f.findings_id} className={styles.findingCard}>
                    <div className={styles.findingHeader} onClick={() => toggleFinding(f.findings_id)}>
                      <span
                        className={styles.severityBadge}
                        style={{ borderColor: SEVERITY_COLOR[f.severity], color: SEVERITY_COLOR[f.severity] }}
                      >
                        {f.severity.toUpperCase()}
                      </span>
                      <span className={styles.findingTitle}>{f.title}</span>
                      <span className={styles.findingAtlas}>{f.atlas_technique_id}</span>
                      <span className={styles.expandIcon}>{isOpen ? '▲' : '▼'}</span>
                    </div>
                    {isOpen && (
                      <div className={styles.findingBody}>
                        <div className={styles.evidenceBlock}>
                          <p className={styles.evidenceLabel}>PROMPT</p>
                          <pre className={styles.evidencePre}>{f.evidence.prompt}</pre>
                        </div>
                        <div className={styles.evidenceBlock}>
                          <p className={styles.evidenceLabel}>RESPONSE</p>
                          <pre className={styles.evidencePre}>{f.evidence.response}</pre>
                        </div>
                        {f.evidence.canary && (
                          <p className={styles.canary}>⚠ Canary triggered: {f.evidence.canary}</p>
                        )}
                        {f.mitigation && (
                          <div className={styles.mitigation}>
                            <span className={styles.mitigationLabel}>MITIGATION</span>
                            <span>{f.mitigation}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
            })}
          </div>
        )}
      </section>

      {/* ── Severity breakdown ── */}
      <section className={styles.card}>
        <p className={styles.cardLabel}>심각도별 침투 현황</p>
        <div className={styles.severityGrid}>
          {SEVERITY_ORDER.map(sev => {
            const count = report.severity_counts[sev as keyof typeof report.severity_counts] ?? 0;
            return (
              <div key={sev} className={styles.severityItem}>
                <span className={styles.severityLabel} style={{ color: SEVERITY_COLOR[sev] }}>
                  {sev.toUpperCase()}
                </span>
                <div className={styles.severityBar}>
                  <div
                    className={styles.severityFill}
                    style={{
                      width: `${count > 0 ? Math.max((count / Math.max(report.stats.findings, 1)) * 100, 4) : 0}%`,
                      background: SEVERITY_COLOR[sev],
                    }}
                  />
                </div>
                <span className={styles.severityCount}>{count}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Past scans ── */}
      {pastScans.length > 0 && (
        <section className={styles.card}>
          <p className={styles.cardLabel}>과거 분석 결과</p>
          <div className={styles.pastList}>
            {pastScans.map(sc => (
              <button
                key={sc.scan_id}
                className={styles.pastItem}
                onClick={() => navigate(`/report/${sc.scan_id}`)}
              >
                <span className={styles.pastId}>#{sc.scan_id}</span>
                <span className={`${styles.pastStatus} ${styles[sc.status]}`}>{sc.status}</span>
                <span className={styles.pastDate}>{sc.started_at?.slice(0, 10) ?? '—'}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {breachedTechniques.length === 0 && (
        <div className={styles.allClearBanner}>
          <span className={styles.allClearIcon}>✓</span>
          <div>
            <p className={styles.allClearTitle}>모든 공격이 방어됨</p>
            <p className={styles.allClearSub}>테스트한 {heatmap.length}개 ATLAS 기법 모두 성공적으로 차단됐습니다.</p>
          </div>
        </div>
      )}

      {/* ── AI Summary (맨 아래) ── */}
      {report.ai_summary && (
        <section className={styles.aiCard}>
          <img src="/logo.png" alt="Hackie" className={styles.aiLogo} />
          <div className={styles.aiBubble}>
            <p className={styles.cardLabel}>AI 분석 요약</p>
            <p className={styles.aiSummary}>{report.ai_summary}</p>
          </div>
        </section>
      )}
    </div>
  );
}

function StatCard({ value, label, color, suffix }: {
  value: number; label: string; color?: string; suffix?: string;
}) {
  return (
    <div className={styles.statCard}>
      <span className={styles.statNum} style={color ? { color } : undefined}>
        {value}{suffix}
      </span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  );
}

function LoadingState() {
  return (
    <div className={styles.loadingWrap}>
      <p className={styles.loadingText}>
        <span className={styles.blink}>█</span> 리포트 생성 중...
      </p>
    </div>
  );
}
