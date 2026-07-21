import { useEffect, useMemo, useRef, useState } from 'react';
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
import { atlasLabel, atlasKoName } from '../shared/constants';
import { opLabel, atlasTermLabel, VERDICT_WORD, riskPct } from '../shared/logReadable';
import { LiveAttackChat, applyAttemptEvent, type ChatExchange } from '../components/scan/LiveAttackChat';
import { AttackSessionList } from '../components/scan/AttackSessionList';
import { EvolutionTreePanel } from '../components/scan/EvolutionTreePanel';
import type { EvolutionNode } from '../api/scans';

type Tab = 'log' | 'chat' | 'tree';

// 터미널 로그 한 줄. — #51
// - text: 단순 라인 순화문(정찰/목표시작/세대/결과 등)
// - attempt: 공격 시도 라인(방식→판정·위험도)을 세그먼트로 렌더(판정어만 색 강조)
// - raw: 원본 기술 로그(상세 로그 토글에서 표시). readable 데이터는 버리지 않는다.
interface AttemptLine { method: string; verdict: 'safe' | 'breach' | 'error'; risk: number | null }
interface LogLine {
  id: number;
  level: string;
  raw: string;
  text?: string;
  attempt?: AttemptLine;
  foldKey?: string;
}
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
  const [breachCount, setBreachCount] = useState(0);
  const [loadingStart, setLoadingStart] = useState(false);
  const [selectedObjectiveId, setSelectedObjectiveId] = useState<number | null>(null);
  const [newObjectiveIds, setNewObjectiveIds] = useState<Set<number>>(new Set());
  const [treeNodes, setTreeNodes] = useState<Map<string, EvolutionNode[]>>(new Map());
  const [selectedAtlasId, setSelectedAtlasId] = useState('');
  const [selectedAtlasName, setSelectedAtlasName] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [activeTab, setActiveTab] = useState<Tab>('log');
  const [showRaw, setShowRaw] = useState(false); // 상세 로그(원본 기술 로그) 토글 — #51
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
      setLogs([{ id: 0, level: 'info', text: '스캔 시작 — 공격 모듈 로딩 중', raw: 'Attack modules loading...' }]);
      subscribeSSE(result.scan_id);
    } catch {
      setStatus('running');
      setLogs([{ id: 0, level: 'info', text: '스캔 시작 — 공격 모듈 로딩 중 (데모)', raw: 'Attack modules loading... (demo mode)' }]);
      const mockScanId = 9999;
      setScanId(mockScanId);
      setRecon(MOCK_RECON);
      setObjectives({ done: 0, total: MOCK_OBJECTIVE_COUNT });
      cancelMockRef.current = simulateScan({
        onLog: (msg, level) =>
          setLogs(prev => [...prev, { id: prev.length, level, text: msg, raw: msg }]),
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

    // 순화문(text/attempt)과 원본 기술문(raw)을 함께 쌓는다 — 상세 로그 토글이 raw를 쓴다.
    const pushLine = (line: Omit<LogLine, 'id'>) =>
      setLogs(prev => [...prev, { id: prev.length, ...line }]);
    const addText = (text: string, raw: string, level = 'info') =>
      pushLine({ level, text, raw });

    es.onmessage = (e: MessageEvent) => {
      const d = JSON.parse(e.data as string);
      const eventType = d.event as string;

      if (eventType === 'log') {
        const m = (d.message ?? d.msg ?? '') as string;
        addText(m, m, d.level ?? 'info');
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
          const tools = (d.tools ?? []) as string[];
          const defenses = (d.defenses ?? []) as string[];
          addText(
            `정찰 완료 — 연동 도구 ${tools.length ? tools.join('·') : '없음'}, 방어 장치 ${defenses.length ? defenses.join('·') : '없음'}`,
            `[RECON] 정찰 완료 — tools: ${tools.join(', ') || '없음'}, defenses: ${defenses.join(', ') || '없음'}`,
          );
          setRecon({ tools: d.tools ?? [], defenses: d.defenses ?? [] });
          setGlobalThinking('표적을 정찰합니다. 방어 수단과 취약점을 분석 중입니다.');
        } else if (d.phase === 'start') {
          const objs = d.objectives ?? 0;
          addText(`공격 목표 ${objs}개 확인 — 공격 시작`, `[SCAN] 목표 ${objs}개 확인, 진화 루프 시작`);
          setObjectives({ done: 0, total: objs });
          setGlobalThinking(`${objs}개 공격 목표를 확인했습니다. 진화 루프를 시작합니다.`);
        } else if (d.phase === 'evolve') {
          const gen = d.generation ?? 0;
          const best = d.best_score ?? 0;
          addText(`${gen}세대 변이 — 최고 위험도 ${riskPct(best)}%`, `[GEN ${gen}] 최고 점수 ${(best * 100).toFixed(1)}%`, 'gen');
        } else if (d.phase === 'objective_done') {
          const breached = d.status === 'breached';
          const doneAtlas = (d.current_attack as { atlas?: string } | null)?.atlas ?? '';
          addText(
            `→ ${atlasTermLabel(doneAtlas)} 테스트 완료: ${breached ? '취약점 발견' : '방어 성공'}`,
            `[OBJECTIVE] 완료 — ${d.status ?? ''}`,
            breached ? 'breach' : 'result',
          );
          setObjectives(prev => ({ ...prev, done: prev.done + 1 }));
          if (doneAtlas) {
            const resultMsg = d.status === 'breached' ? '취약점을 발견했습니다.' : '방어에 성공했습니다.';
            const msg = `${atlasLabel(doneAtlas)}: ${resultMsg} 이 기법의 공격을 종료합니다.`;
            setGlobalThinking(msg);
          }
        }
      } else if (eventType === 'seeds_retrieved') {
        const atlas = d.atlas as string;
        const count = d.count as number;
        pushLine({
          level: 'head',
          text: `▶ ${atlasTermLabel(atlas)} 방어 테스트 시작 · ${atlas}`,
          raw: `[${atlasKoName(atlas)}] 공격을 시작 · ${atlas}`,
        });
        addText(`공격 데이터베이스에서 기본 공격 ${count}개 선택`, `[SEED] ${atlasLabel(atlas)} — 프롬프트 ${count}개 선택`);
        setGlobalThinking(`${atlasLabel(atlas)}: 공격 데이터베이스에서 프롬프트 ${count}개를 선택했습니다. 0세대 발사를 시작합니다.`);
      } else if (eventType === 'attempt_started') {
        objectiveToAtlasRef.current.set(d.objective_id as number, d.atlas as string);
        setExchanges(prev => applyAttemptEvent(prev, d));
      } else if (eventType === 'attempt') {
        objectiveToAtlasRef.current.set(d.objective_id as number, d.atlas as string);
        setExchanges(prev => applyAttemptEvent(prev, d));
        const verdict = d.verdict as string;
        const scoreRaw = ((d.score ?? 0) * 100).toFixed(1);
        const rawOp = d.mutation_op ? ` [${d.mutation_op}]` : '';
        const errDetail = verdict === 'error'
          ? ` — ${d.error ?? '대상 서버 응답 없음'}`
          : '';
        const vkind: AttemptLine['verdict'] =
          verdict === 'breach' ? 'breach' : verdict === 'error' ? 'error' : 'safe';
        const method = opLabel(d.mutation_op as string | undefined);
        const risk = vkind === 'error' ? null : riskPct(d.score);
        pushLine({
          level: vkind === 'breach' ? 'breach' : vkind === 'error' ? 'info' : 'ok',
          attempt: { method, verdict: vkind, risk },
          foldKey: `${method}|${vkind}|${risk}`,
          raw: `${atlasLabel(d.atlas)}${rawOp} ${verdict} (${scoreRaw}%)${errDetail}`,
        });
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
        const sevKo = d.severity === 'critical' ? '심각' : d.severity === 'medium' ? '보통' : '높음';
        addText(
          `⚠ 취약점 발견: ${atlasTermLabel(d.atlas)} (심각도: ${sevKo})`,
          `⚠ 취약점 발견: ${atlasLabel(d.atlas)} (심각도: ${d.severity ?? 'high'})`,
          'breach',
        );
        setBreachCount(c => c + 1);
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
    setBreachCount(0);
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

  // 연속 동일 시도 접기(#51): 같은 foldKey가 연달아 오면 첫 줄만 남기고 "(외 N회 동일)"로 축약.
  // 원본 logs는 그대로 두고 렌더 시점에만 축약(상세 로그·데이터 보존).
  const foldedLogs = useMemo(() => {
    const out: { line: LogLine; dup: number }[] = [];
    for (const line of logs) {
      const last = out[out.length - 1];
      if (line.foldKey && last && last.line.foldKey === line.foldKey) {
        last.dup += 1;
      } else {
        out.push({ line, dup: 0 });
      }
    }
    return out;
  }, [logs]);

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
              <button
                type="button"
                className={styles.rawToggle}
                onClick={() => setShowRaw(v => !v)}
                aria-pressed={showRaw}
              >
                {showRaw ? '간단히 보기' : '상세 로그'}
              </button>
            </div>
            <div className={styles.termBody}>
              {logs.length === 0 && (
                <p className={styles.termEmpty}>스캔을 시작하면 실시간 로그가 표시됩니다.</p>
              )}
              {showRaw
                ? /* 상세 로그: 전문가용 원본 기술 로그(AML 코드·op·점수 원문). 접기 없이 전부. */
                  logs.map(line => (
                    <p key={line.id} className={`${styles.logLine} ${styles.rawLine}`}>
                      <span className={styles.logPrompt}>›</span> {line.raw}
                    </p>
                  ))
                : foldedLogs.map(({ line, dup }) => (
                    <p key={line.id} className={`${styles.logLine} ${styles[line.level] ?? ''}`}>
                      <span className={styles.logPrompt}>›</span>{' '}
                      {line.attempt ? (
                        <span>
                          {line.attempt.method} →{' '}
                          <span className={`${styles.verdict} ${styles[`v_${line.attempt.verdict}`] ?? ''}`}>
                            {VERDICT_WORD[line.attempt.verdict]}
                          </span>
                          {line.attempt.risk != null && ` · 위험도 ${line.attempt.risk}%`}
                        </span>
                      ) : (
                        line.text
                      )}
                      {dup > 0 && <span className={styles.foldNote}> (외 {dup}회 동일)</span>}
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
                  ✓ 스캔 완료 — {Math.max(objectives.total - breachCount, 0)}개 유형 방어, 취약점 {breachCount}건
                </p>
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
