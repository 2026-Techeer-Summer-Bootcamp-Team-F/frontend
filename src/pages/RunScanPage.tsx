import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { listAttackTypes, getProject, type AttackType, type Project } from '../api/projects';
import { startScan, cancelScan, type ScanConfig } from '../api/scans';
import styles from './RunScanPage.module.css';

interface LogLine { id: number; msg: string; level: string }
interface ProgressData {
  generation: number;
  evaluated: number;
  best_score: number;
  phase: string;
  current_attack: { name: string; atlas: string; status: string } | null;
  summary: { completed: number; total: number; success: number; failed: number; running: number } | null;
}

const TARGET_MODELS = [
  { value: 'current', label: '정찰값 사용 (current)' },
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'gpt-4o-mini', label: 'GPT-4o-mini' },
  { value: 'claude', label: 'Claude' },
  { value: 'local', label: 'Local (Ollama)' },
];

export function RunScanPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<Project | null>(null);
  const [attackTypes, setAttackTypes] = useState<AttackType[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [targetModel, setTargetModel] = useState('current');
  const [scanId, setScanId] = useState<number | null>(null);
  const [status, setStatus] = useState<'idle' | 'running' | 'done' | 'failed'>('idle');
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [loadingStart, setLoadingStart] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!projectId) return;
    Promise.all([getProject(Number(projectId)), listAttackTypes()])
      .then(([p, types]) => {
        setProject(p);
        setAttackTypes(types);
        setSelected(new Set(types.map(t => t.key)));
      })
      .catch(() => {});
  }, [projectId]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const toggleAttack = (key: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const handleStart = async () => {
    if (!projectId || selected.size === 0) return;
    setLoadingStart(true);
    try {
      const config: ScanConfig = {
        attack_types: Array.from(selected),
        target_model: targetModel,
        population_size: 8,
        max_generations: 5,
      };
      const result = await startScan(Number(projectId), config);
      setScanId(result.scan_id);
      setStatus('running');
      setLogs([{ id: 0, msg: 'Attack modules loading...', level: 'info' }]);
      subscribeSSE(result.scan_id);
    } catch {
      setStatus('failed');
    } finally {
      setLoadingStart(false);
    }
  };

  const subscribeSSE = (id: number) => {
    const base = import.meta.env.VITE_API_BASE_URL ?? '';
    const token = localStorage.getItem('access_token') ?? '';
    const es = new EventSource(`${base}/scans/${id}/stream?token=${token}`);
    esRef.current = es;

    es.addEventListener('log', (e: MessageEvent) => {
      const d = JSON.parse(e.data as string);
      setLogs(prev => [...prev, { id: prev.length, msg: d.msg, level: d.level }]);
    });

    es.addEventListener('progress', (e: MessageEvent) => {
      const d = JSON.parse(e.data as string);
      setProgress(d as ProgressData);
    });

    es.addEventListener('done', (e: MessageEvent) => {
      const d = JSON.parse(e.data as string);
      setStatus(d.status === 'done' ? 'done' : 'failed');
      es.close();
      if (d.status === 'done') {
        setTimeout(() => navigate(`/report/${id}`), 1200);
      }
    });

    es.onerror = () => { setStatus('failed'); es.close(); };
  };

  const handleCancel = async () => {
    if (!scanId) return;
    esRef.current?.close();
    await cancelScan(scanId);
    setStatus('failed');
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <p className={styles.label}>STEP 3 / 3 — AI RED TEAMING ANALYSIS</p>
        <h1 className={styles.title}>
          {project?.project_name ?? '분석 설정'}
          {status === 'running' && <span className={styles.runningBadge}> RUNNING</span>}
          {status === 'done' && <span className={styles.doneBadge}> DONE</span>}
        </h1>
      </div>

      <div className={styles.layout}>
        {/* ── Left: config ── */}
        <aside className={styles.sidebar}>
          <section className={styles.card}>
            <p className={styles.cardLabel}>ATTACK TYPES ({selected.size}/{attackTypes.length})</p>
            <div className={styles.attackList}>
              {attackTypes.map(at => (
                <label key={at.key} className={`${styles.attackItem} ${selected.has(at.key) ? styles.checked : ''}`}>
                  <input
                    type="checkbox"
                    className={styles.checkbox}
                    checked={selected.has(at.key)}
                    onChange={() => toggleAttack(at.key)}
                    disabled={status !== 'idle'}
                  />
                  <span className={styles.attackLabel}>{at.label}</span>
                  <span className={styles.atlasTag}>{at.atlas.split('.')[1]}</span>
                </label>
              ))}
            </div>
          </section>

          <section className={styles.card}>
            <p className={styles.cardLabel}>TARGET MODEL</p>
            <select
              className={styles.select}
              value={targetModel}
              onChange={e => setTargetModel(e.target.value)}
              disabled={status !== 'idle'}
            >
              {TARGET_MODELS.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </section>

          {status === 'idle' && (
            <button
              className={styles.startBtn}
              onClick={handleStart}
              disabled={loadingStart || selected.size === 0}
            >
              {loadingStart ? '시작 중...' : '›_ Start Scan'}
            </button>
          )}
          {status === 'running' && (
            <button className={styles.cancelBtn} onClick={handleCancel}>
              ▪ 스캔 취소
            </button>
          )}
        </aside>

        {/* ── Right: live feed ── */}
        <div className={styles.liveArea}>
          {/* Progress bar */}
          {progress && (
            <section className={styles.card}>
              <p className={styles.cardLabel}>PROGRESS</p>
              <div className={styles.progressInfo}>
                <span>세대 {progress.generation}</span>
                <span>평가 {progress.evaluated}개</span>
                <span>최고 점수 {progress.best_score.toFixed(3)}</span>
                <span className={styles.phase}>{progress.phase.toUpperCase()}</span>
              </div>
              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${Math.min(progress.best_score * 100, 100)}%` }}
                />
              </div>
              {progress.current_attack && (
                <p className={styles.currentAttack}>
                  <span className={styles.attackDot}>▶</span>
                  {progress.current_attack.name}
                  <span className={styles.atlasInline}> {progress.current_attack.atlas}</span>
                  <span className={styles.attackStatus}> {progress.current_attack.status}</span>
                </p>
              )}
            </section>
          )}

          {/* Summary */}
          {progress?.summary && (
            <section className={styles.card}>
              <p className={styles.cardLabel}>SUMMARY</p>
              <div className={styles.summaryGrid}>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryNum}>{progress.summary.completed}</span>
                  <span className={styles.summaryKey}>완료 / {progress.summary.total}</span>
                </div>
                <div className={styles.summaryItem}>
                  <span className={`${styles.summaryNum} ${styles.red}`}>{progress.summary.success}</span>
                  <span className={styles.summaryKey}>침투 성공</span>
                </div>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryNum}>{progress.summary.failed}</span>
                  <span className={styles.summaryKey}>실패</span>
                </div>
                <div className={styles.summaryItem}>
                  <span className={`${styles.summaryNum} ${styles.orange}`}>{progress.summary.running}</span>
                  <span className={styles.summaryKey}>진행 중</span>
                </div>
              </div>
            </section>
          )}

          {/* Live log terminal */}
          <section className={styles.terminal}>
            <div className={styles.termTitle}>
              <div className={styles.dots}>
                <span className={`${styles.dot} ${styles.g}`} />
                <span className={`${styles.dot} ${styles.y}`} />
                <span className={`${styles.dot} ${styles.gr}`} />
              </div>
              <span>redi@console — Live Analysis Log</span>
              {status === 'idle' && <span className={styles.waiting}>대기 중</span>}
            </div>
            <div className={styles.termBody}>
              {logs.length === 0 && (
                <p className={styles.termEmpty}>스캔을 시작하면 실시간 로그가 표시됩니다.</p>
              )}
              {logs.map(line => (
                <p key={line.id} className={`${styles.logLine} ${styles[line.level] ?? ''}`}>
                  <span className={styles.logPrompt}>›</span> {line.msg}
                </p>
              ))}
              {status === 'running' && (
                <p className={styles.logLine}>
                  <span className={styles.logPrompt}>›</span>
                  <span className={styles.cursor} />
                </p>
              )}
              {status === 'done' && (
                <p className={`${styles.logLine} ${styles.done}`}>
                  ✓ 스캔 완료 — 리포트 페이지로 이동합니다...
                </p>
              )}
              <div ref={logEndRef} />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
