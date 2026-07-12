import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { listAttackTypes, getProject, type AttackType, type Project } from '../api/projects';
import { startScan, cancelScan, type ScanConfig } from '../api/scans';
import { getMockProject, MOCK_ATTACK_TYPES, simulateScan } from '../api/mock';
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
  const cancelMockRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!projectId) return;
    Promise.all([getProject(Number(projectId)), listAttackTypes()])
      .then(([p, types]) => {
        setProject(p);
        setAttackTypes(types);
        setSelected(new Set(types.map(t => t.key)));
      })
      .catch(() => {
        const mockProject = getMockProject(Number(projectId));
        if (mockProject) setProject(mockProject);
        setAttackTypes(MOCK_ATTACK_TYPES);
        setSelected(new Set(MOCK_ATTACK_TYPES.map(t => t.key)));
      });
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
      setStatus('running');
      setLogs([{ id: 0, msg: 'Attack modules loading... (demo mode)', level: 'info' }]);
      const mockScanId = 9999;
      setScanId(mockScanId);
      cancelMockRef.current = simulateScan({
        onLog: (msg, level) =>
          setLogs(prev => [...prev, { id: prev.length, msg, level }]),
        onProgress: data => setProgress(data),
        onDone: st => {
          setStatus(st === 'done' ? 'done' : 'failed');
        },
      });
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
    });

    es.onerror = () => { setStatus('failed'); es.close(); };
  };

  const handleCancel = async () => {
    if (!scanId) return;
    esRef.current?.close();
    cancelMockRef.current?.();
    try { await cancelScan(scanId); } catch { /* demo mode */ }
    setStatus('failed');
  };

  return (
    <div className={styles.page}>
      {/* ── Header ── */}
      <div className={styles.header}>
        <p className={styles.label}>STEP 3 / 3 — AI RED TEAMING ANALYSIS</p>
        <h1 className={styles.title}>
          {project?.project_name ?? '분석 설정'}
          {status === 'running' && <span className={styles.runningBadge}> RUNNING</span>}
          {status === 'done' && <span className={styles.doneBadge}> DONE</span>}
        </h1>
      </div>

      {/* ── Hero: gif + button (centered top) ── */}
      <div className={styles.hero}>
        <div className={styles.hackieWrap}>
          <img
            src="/hackie.gif"
            alt="Hackie"
            className={`${styles.hackie} ${status === 'running' ? styles.hackieRunning : ''}`}
          />
          {status === 'done' && <p className={styles.hackieDone}>✓ 스캔 완료</p>}
        </div>

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
        {status === 'done' && (
          <button className={styles.reportBtn} onClick={() => navigate(`/report/${scanId}`)}>
            ›_ 스캔 결과 리포트 보기
          </button>
        )}
      </div>

      {/* ── Live log (fixed height, scrollable) ── */}
      <section className={styles.terminal}>
        <div className={styles.termTitle}>
          <div className={styles.dots}>
            <span className={`${styles.dot} ${styles.g}`} />
            <span className={`${styles.dot} ${styles.y}`} />
            <span className={`${styles.dot} ${styles.gr}`} />
          </div>
          <span>redi@console — Live Analysis Log</span>
          {status === 'idle' && <span className={styles.waiting}>대기 중</span>}
          {status === 'running' && (
            <span className={styles.analyzing}>
              <span className={styles.blink}>█</span> 분석 중...
            </span>
          )}
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
              ✓ 스캔 완료
            </p>
          )}
          <div ref={logEndRef} />
        </div>
      </section>
    </div>
  );
}
