import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { listAttackTypes, getProject, type AttackType, type Project } from '../api/projects';
import { startScan, cancelScan, type ScanConfig } from '../api/scans';
import {
  getMockProject, MOCK_ATTACK_TYPES, MOCK_OBJECTIVE_COUNT, MOCK_RECON, simulateScan,
} from '../api/mock';
import { getToken } from '../utils/auth';
import styles from './RunScanPage.module.css';
import { useTutorial } from '../hooks/useTutorial';
import { TutorialOverlay } from '../components/tutorial/TutorialOverlay';
import { atlasLabel } from '../shared/constants';
import { LiveAttackChat, applyAttemptEvent, type ChatExchange } from '../components/scan/LiveAttackChat';
import { AttackSessionList } from '../components/scan/AttackSessionList';
import { EvolutionTreePanel } from '../components/scan/EvolutionTreePanel';
import type { EvolutionNode } from '../api/scans';

type Tab = 'log' | 'chat' | 'tree';

interface LogLine { id: number; msg: string; level: string }
interface ProgressData {
  generation: number;
  evaluated: number;
  best_score: number;
  phase: string;
  current_attack: { name: string; atlas: string; status: string } | null;
  summary: { completed: number; total: number; success: number; failed: number; running: number } | null;
}

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
  const [exchanges, setExchanges] = useState<ChatExchange[]>([]);
  const [recon, setRecon] = useState<{ tools: string[]; defenses: string[] } | null>(null);
  const [objectives, setObjectives] = useState({ done: 0, total: 0 });
  const [loadingStart, setLoadingStart] = useState(false);
  const [selectedObjectiveId, setSelectedObjectiveId] = useState<number | null>(null);
  const [newObjectiveIds, setNewObjectiveIds] = useState<Set<number>>(new Set());
  const [treeNodes, setTreeNodes] = useState<Map<string, EvolutionNode[]>>(new Map());
  const [selectedAtlasId, setSelectedAtlasId] = useState('');
  const [selectedAtlasName, setSelectedAtlasName] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [activeTab, setActiveTab] = useState<Tab>('log');
  const [globalThinking, setGlobalThinking] = useState('스캔을 시작하면 AI 사고 과정이 표시됩니다.');

  // 트리 탭 전용 세션 선택 (채팅 탭과 독립)
  const [treeSelectedObjectiveId, setTreeSelectedObjectiveId] = useState<number | null>(null);
  const [treeSelectedAtlasId, setTreeSelectedAtlasId] = useState('');
  const [treeSelectedAtlasName, setTreeSelectedAtlasName] = useState('');

  const logEndRef = useRef<HTMLDivElement>(null);
  const esRef = useRef<EventSource | null>(null);
  const cancelMockRef = useRef<(() => void) | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const objectiveToAtlasRef = useRef(new Map<number, string>());
  const seenObjectivesRef = useRef<Set<number>>(new Set());
  const userSelectedRef = useRef(false);
  const treeUserSelectedRef = useRef(false);
  const userChangedTabRef = useRef(false);

  const tutorial = useTutorial('analysis', [
    {
      selector: 'start-btn',
      title: '스캔 실행',
      desc: '설정한 공격 유형으로 AI 레드팀 분석을 시작합니다. 진화 알고리즘이 다양한 공격 프롬프트를 자동 생성하며 취약점을 탐색합니다.',
    },
    {
      selector: 'term-body',
      title: '실시간 로그',
      desc: '스캔 진행 상황이 실시간으로 출력됩니다. 각 공격 시도의 결과와 최고 점수를 여기서 확인할 수 있습니다.',
    },
  ]);

  // 새 세션 등장 시 자동 선택 + 첫 세션이면 채팅 탭으로 전환
  useEffect(() => {
    if (exchanges.length === 0) return;
    const last = exchanges[exchanges.length - 1];
    if (!seenObjectivesRef.current.has(last.objectiveId)) {
      const isFirst = seenObjectivesRef.current.size === 0;
      seenObjectivesRef.current.add(last.objectiveId);
      if (!userSelectedRef.current) {
        setSelectedObjectiveId(last.objectiveId);
        setSelectedAtlasId(last.atlas);
        setSelectedAtlasName(last.atlasName ?? '');
      } else {
        setNewObjectiveIds(prev => new Set([...prev, last.objectiveId]));
      }
      if (!treeUserSelectedRef.current) {
        setTreeSelectedObjectiveId(last.objectiveId);
        setTreeSelectedAtlasId(last.atlas);
        setTreeSelectedAtlasName(last.atlasName ?? '');
      }
      if (isFirst && !userChangedTabRef.current) {
        setActiveTab('chat');
      }
    }
  }, [exchanges]);

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

  useEffect(() => {
    if (status === 'running') {
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [status]);

  useEffect(() => {
    if (status !== 'done' && status !== 'failed') return;
    const send = () => {
      new Notification(status === 'done' ? '✅ 스캔 완료' : '❌ 스캔 실패', {
        body: status === 'done'
          ? `${project?.project_name ?? '프로젝트'} 분석이 완료됐습니다.`
          : `${project?.project_name ?? '프로젝트'} 스캔 중 오류가 발생했습니다.`,
        icon: '/raccoon.png',
      });
    };
    if (Notification.permission === 'granted') {
      send();
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(p => { if (p === 'granted') send(); });
    }
  }, [status, project?.project_name]);

  const fmtElapsed = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const handleStart = async () => {
    if (!projectId || selected.size === 0) return;
    if (Notification.permission === 'default') Notification.requestPermission();
    setLoadingStart(true);
    setActiveTab('log');
    userChangedTabRef.current = false;
    setGlobalThinking('공격 모듈을 로드하고 있습니다...');
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
      setRecon(MOCK_RECON);
      setObjectives({ done: 0, total: MOCK_OBJECTIVE_COUNT });
      cancelMockRef.current = simulateScan({
        onLog: (msg, level) =>
          setLogs(prev => [...prev, { id: prev.length, msg, level }]),
        onProgress: data => setProgress(data),
        onAttemptEvent: e => {
          objectiveToAtlasRef.current.set(e.objective_id, e.atlas);
          setExchanges(prev => applyAttemptEvent(prev, e));
        },
        onObjectiveDone: id => {
          setObjectives(prev => ({ ...prev, done: prev.done + 1 }));
          const atlas = objectiveToAtlasRef.current.get(id);
          if (atlas) {
            const msg = `${atlasLabel(atlas)}: 이 기법의 공격을 종료합니다.`;
            setGlobalThinking(msg);
          }
        },
        onDone: st => {
          setStatus(st === 'done' ? 'done' : 'failed');
          setGlobalThinking('모든 공격 분석을 종료했습니다.');
        },
      });
    } finally {
      setLoadingStart(false);
    }
  };

  const subscribeSSE = (id: number) => {
    const base = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';
    const token = getToken() ?? '';
    const es = new EventSource(`${base}/scans/${id}/stream?token=${token}`);
    esRef.current = es;

    const addLog = (msg: string, level = 'info') =>
      setLogs(prev => [...prev, { id: prev.length, msg, level }]);

    es.onmessage = (e: MessageEvent) => {
      const d = JSON.parse(e.data as string);
      const eventType = d.event as string;

      if (eventType === 'log') {
        addLog(d.message ?? d.msg ?? '', d.level ?? 'info');
      } else if (eventType === 'progress') {
        setProgress(prev => ({
          generation: d.generation ?? prev?.generation ?? 0,
          evaluated: d.evaluated ?? prev?.evaluated ?? 0,
          best_score: d.best_score ?? prev?.best_score ?? 0,
          phase: d.phase ?? prev?.phase ?? '',
          current_attack: d.current_attack ?? prev?.current_attack ?? null,
          summary: d.summary ?? prev?.summary ?? null,
        }));
        if (d.phase === 'recon') {
          addLog(`[RECON] 정찰 완료 — tools: ${(d.tools ?? []).join(', ') || '없음'}, defenses: ${(d.defenses ?? []).join(', ') || '없음'}`);
          setRecon({ tools: d.tools ?? [], defenses: d.defenses ?? [] });
          setGlobalThinking('표적을 정찰합니다. 방어 수단과 취약점을 분석 중입니다.');
        } else if (d.phase === 'start') {
          addLog(`[SCAN] 목표 ${d.objectives ?? 0}개 확인, 진화 루프 시작`);
          setObjectives({ done: 0, total: d.objectives ?? 0 });
          setGlobalThinking(`${d.objectives ?? 0}개 공격 목표를 확인했습니다. 진화 루프를 시작합니다.`);
        } else if (d.phase === 'evolve') {
          addLog(`[GEN ${d.generation}] 최고 점수 ${((d.best_score ?? 0) * 100).toFixed(1)}%`);
        } else if (d.phase === 'objective_done') {
          addLog(`[OBJECTIVE] 완료 — ${d.status ?? ''}`, d.status === 'breached' ? 'error' : 'info');
          setObjectives(prev => ({ ...prev, done: prev.done + 1 }));
          const doneAtlas = (d.current_attack as { atlas?: string } | null)?.atlas ?? '';
          if (doneAtlas) {
            const resultMsg = d.status === 'breached' ? '취약점을 발견했습니다.' : '방어에 성공했습니다.';
            const msg = `${atlasLabel(doneAtlas)}: ${resultMsg} 이 기법의 공격을 종료합니다.`;
            setGlobalThinking(msg);
          }
        }
      } else if (eventType === 'seeds_retrieved') {
        const atlas = d.atlas as string;
        const count = d.count as number;
        addLog(`[SEED] ${atlasLabel(atlas)} — 공격 데이터베이스에서 프롬프트 ${count}개 선택`);
        setGlobalThinking(`${atlasLabel(atlas)}: 공격 데이터베이스에서 프롬프트 ${count}개를 선택했습니다. 0세대 발사를 시작합니다.`);
      } else if (eventType === 'attempt_started') {
        objectiveToAtlasRef.current.set(d.objective_id as number, d.atlas as string);
        setExchanges(prev => applyAttemptEvent(prev, d));
      } else if (eventType === 'attempt') {
        objectiveToAtlasRef.current.set(d.objective_id as number, d.atlas as string);
        setExchanges(prev => applyAttemptEvent(prev, d));
        const verdict = d.verdict as string;
        const score = ((d.score ?? 0) * 100).toFixed(1);
        const op = d.mutation_op ? ` [${d.mutation_op}]` : '';
        const errDetail = verdict === 'error'
          ? ` — ${d.error ?? '대상 서버 응답 없음'}`
          : '';
        addLog(
          `${atlasLabel(d.atlas)}${op} ${verdict} (${score}%)${errDetail}`,
          verdict === 'breach' ? 'error' : verdict === 'error' ? 'warn' : 'info',
        );
        if (d.improvement) setGlobalThinking(`${atlasLabel(d.atlas as string)}: ${d.improvement as string}`);
        const node: EvolutionNode = {
          attempt_id: d.attempt_id,
          parent_id: d.parent_id ?? null,
          generation: d.generation ?? 0,
          prompt_preview: ((d.attack_prompt ?? d.prompt ?? '') as string).slice(0, 120),
          score: d.score ?? 0,
          verdict: verdict === 'breach' ? 'breached' : verdict === 'error' ? 'error' : 'safe',
          mutation_op: d.mutation_op || 'seed',
          improvement: d.improvement ?? '',
        };
        setTreeNodes(prev => {
          const next = new Map(prev);
          const arr = [...(next.get(d.atlas as string) ?? []), node];
          next.set(d.atlas as string, arr);
          return next;
        });
      } else if (eventType === 'finding') {
        addLog(`⚠ 취약점 발견: ${atlasLabel(d.atlas)} (심각도: ${d.severity ?? 'high'})`, 'error');
      } else if (eventType === 'done') {
        setStatus(d.status === 'done' ? 'done' : 'failed');
        setGlobalThinking('모든 공격 분석을 종료했습니다.');
        es.close();
      }
    };

    es.onerror = () => { setStatus('failed'); es.close(); };
  };

  const handleCancel = async () => {
    if (!scanId) return;
    esRef.current?.close();
    cancelMockRef.current?.();
    try { await cancelScan(scanId); } catch { /* demo mode */ }
    setStatus('failed');
  };

  const handleRestart = async () => {
    esRef.current?.close();
    cancelMockRef.current?.();
    if (scanId && status === 'running') {
      try { await cancelScan(scanId); } catch { /* demo mode */ }
    }
    setScanId(null);
    setStatus('idle');
    setLogs([]);
    setProgress(null);
    setElapsed(0);
    setExchanges([]);
    setRecon(null);
    setObjectives({ done: 0, total: 0 });
    setSelectedObjectiveId(null);
    setNewObjectiveIds(new Set());
    seenObjectivesRef.current = new Set();
    userSelectedRef.current = false;
    treeUserSelectedRef.current = false;
    userChangedTabRef.current = false;
    setTreeNodes(new Map());
    objectiveToAtlasRef.current = new Map();
    setSelectedAtlasId('');
    setSelectedAtlasName('');
    setTreeSelectedObjectiveId(null);
    setTreeSelectedAtlasId('');
    setTreeSelectedAtlasName('');
    setGlobalThinking('스캔을 시작하면 AI 사고 과정이 표시됩니다.');
    setActiveTab('log');
  };

  const switchTab = (tab: Tab) => {
    userChangedTabRef.current = true;
    setActiveTab(tab);
    if (tab === 'chat') setNewObjectiveIds(new Set());
  };

  const aiThinkingLines = globalThinking
    .split(/(?<=[.。!?])\s+|[\n]/)
    .map(s => s.trim())
    .filter(Boolean);

  const chatBadge = newObjectiveIds.size > 0 && activeTab !== 'chat';

  return (
    <div className={styles.page}>
      {tutorial.active && tutorial.currentStep && (
        <TutorialOverlay
          step={tutorial.currentStep}
          stepIndex={tutorial.step}
          total={tutorial.total}
          onNext={tutorial.next}
          onPrev={tutorial.prev}
          onSkip={tutorial.skip}
        />
      )}

      {/* ── Header ── */}
      <div className={styles.header}>
        <p className={styles.label}>STEP 3 / 3 — AI RED TEAMING ANALYSIS</p>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>
            {project?.project_name ?? '분석 설정'}
            {status === 'running' && <span className={styles.runningBadge}> RUNNING</span>}
            {status === 'done' && <span className={styles.doneBadge}> DONE</span>}
          </h1>
          <div className={styles.headerActions}>
            {status === 'idle' && (
              <button
                className={styles.startBtn}
                data-tutorial="start-btn"
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
              <div className={styles.btnRow}>
                <button className={styles.reportBtn} onClick={() => navigate(`/report/${scanId}`)}>
                  ›_ 스캔 결과 리포트 보기
                </button>
                <button className={styles.restartBtn} onClick={handleRestart}>
                  ↺ 다시 스캔
                </button>
              </div>
            )}
            {status === 'failed' && (
              <button className={styles.restartBtn} onClick={handleRestart}>
                ↺ 다시 스캔
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── 탭 바 ── */}
      <div className={styles.tabBar}>
        <button
          className={`${styles.tabBtn} ${activeTab === 'log' ? styles.tabActive : ''}`}
          onClick={() => switchTab('log')}
        >
          터미널 로그
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'chat' ? styles.tabActive : ''}`}
          onClick={() => switchTab('chat')}
        >
          공격 채팅
          {chatBadge && (
            <span className={styles.tabBadge}>{newObjectiveIds.size}</span>
          )}
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'tree' ? styles.tabActive : ''}`}
          onClick={() => switchTab('tree')}
        >
          진화 트리
        </button>

        <div className={styles.tabSpacer} />

        {status === 'running' && (
          <span className={styles.tabStatus}>
            <span className={styles.blink}>█</span>
            <span className={styles.tabTimer}>{fmtElapsed(elapsed)}</span>
          </span>
        )}
        {status === 'done' && (
          <span className={styles.tabTimerDone}>{fmtElapsed(elapsed)}</span>
        )}
        {status === 'idle' && (
          <span className={styles.tabIdle}>대기 중</span>
        )}
      </div>

      {/* ── 탭 콘텐츠 ── */}
      <div className={styles.tabContent}>

        {/* 터미널 로그 탭 */}
        {activeTab === 'log' && (
          <section className={styles.terminal} data-tutorial="term-body">
            <div className={styles.termTitle}>
              <div className={styles.dots}>
                <span className={`${styles.dot} ${styles.g}`} />
                <span className={`${styles.dot} ${styles.y}`} />
                <span className={`${styles.dot} ${styles.gr}`} />
              </div>
              <span>redi@console — Live Analysis Log</span>
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
                <p className={`${styles.logLine} ${styles.done}`}>✓ 스캔 완료</p>
              )}
              <div ref={logEndRef} />
            </div>
          </section>
        )}

        {/* 공격 채팅 탭 */}
        {activeTab === 'chat' && (
          <div className={styles.chatTabLayout}>
            <LiveAttackChat
              exchanges={exchanges}
              status={status}
              targetName={project?.project_name ?? '표적'}
              recon={recon}
              generation={progress?.generation ?? 0}
              objectivesDone={objectives.done}
              objectivesTotal={objectives.total}
              selectedObjectiveId={selectedObjectiveId}
            />
            <AttackSessionList
              exchanges={exchanges}
              selected={selectedObjectiveId}
              onSelect={id => {
                userSelectedRef.current = true;
                setSelectedObjectiveId(id);
                setNewObjectiveIds(prev => { const n = new Set(prev); n.delete(id); return n; });
                const ex = exchanges.find(e => e.objectiveId === id);
                if (ex) {
                  setSelectedAtlasId(ex.atlas);
                  setSelectedAtlasName(ex.atlasName ?? '');
                }
              }}
              newSessions={newObjectiveIds}
              status={status}
            />
          </div>
        )}

        {/* 진화 트리 탭 */}
        {activeTab === 'tree' && (
          <div className={styles.treeTabLayout}>
            <EvolutionTreePanel
              nodes={treeNodes.get(treeSelectedAtlasId) ?? []}
              atlasId={treeSelectedAtlasId}
              atlasName={treeSelectedAtlasName}
            />
            <AttackSessionList
              exchanges={exchanges}
              selected={treeSelectedObjectiveId}
              onSelect={id => {
                treeUserSelectedRef.current = true;
                setTreeSelectedObjectiveId(id);
                setNewObjectiveIds(prev => { const n = new Set(prev); n.delete(id); return n; });
                const ex = exchanges.find(e => e.objectiveId === id);
                if (ex) {
                  setTreeSelectedAtlasId(ex.atlas);
                  setTreeSelectedAtlasName(ex.atlasName ?? '');
                }
              }}
              newSessions={newObjectiveIds}
              status={status}
            />
          </div>
        )}

      </div>

      {/* ── AI 사고 과정 ── */}
      <div className={styles.aiThinkingBar}>
        <div className={styles.aiThinkingAvatar}>
          <img src="/logo.png" alt="Hackie" />
          <span className={styles.aiThinkingAvatarName}>Hackie</span>
        </div>
        <div className={styles.aiThinkingContent}>
          <span className={styles.aiThinkingLabel}>AI 사고 과정</span>
          <p
            key={globalThinking}
            className={styles.aiThinkingSentence}
          >
            › {aiThinkingLines.at(-1) ?? ''}
          </p>
        </div>
      </div>
    </div>
  );
}
