import { Fragment, useEffect, useRef } from 'react';
import type { ScanAttemptEvent, ScanAttemptStartedEvent, ScanVerdict } from '../../types';
import { ATLAS_LABELS } from '../../shared/constants';
import styles from './LiveAttackChat.module.css';

/** 공격 1건 = 교환 1건. 응답 전이면 response===null → 타이핑 인디케이터. */
export interface ChatExchange {
  /** 상관 키 `${objective_id}:${attempt_index}` — started와 attempt를 짝짓는다 */
  key: string;
  objectiveId: number;
  atlas: string;
  atlasName: string;
  generation: number;
  mutationOp: string;
  attackPrompt: string;
  attackTruncated: boolean;
  response: {
    text: string;
    truncated: boolean;
    verdict: ScanVerdict;
    score: number;
    canaryTriggered: boolean;
    flagToken: string | null;
    error?: string;
  } | null;
}

type AttemptEvent = ScanAttemptStartedEvent | ScanAttemptEvent;

const exchangeKey = (objectiveId: number, attemptIndex: number) => `${objectiveId}:${attemptIndex}`;

/**
 * SSE attempt 계열 이벤트를 교환 목록에 반영하는 순수 리듀서.
 *
 * - `attempt_started`(발사 직전) → 응답 없는 교환 추가 = 공격 말풍선 + 타이핑
 * - `attempt`(응답·판정 후) → 같은 상관 키를 찾아 응답을 채움
 * - 짝이 없는 `attempt`는 완성형으로 추가 — SSE 재접속(Last-Event-ID)이나 `?after=` 재생으로
 *   started를 놓쳐도 채팅이 비지 않게 하는 degrade 경로다.
 */
export function applyAttemptEvent(prev: ChatExchange[], event: AttemptEvent): ChatExchange[] {
  const key = exchangeKey(event.objective_id, event.attempt_index);

  if (event.event === 'attempt_started') {
    if (prev.some(x => x.key === key)) return prev;      // 재생으로 중복 수신 시 무시
    return [...prev, {
      key,
      objectiveId: event.objective_id,
      atlas: event.atlas,
      atlasName: event.atlas_name,
      generation: event.generation,
      mutationOp: event.mutation_op,
      attackPrompt: event.attack_prompt,
      attackTruncated: event.attack_prompt_truncated,
      response: null,
    }];
  }

  const response: ChatExchange['response'] = {
    text: event.target_response,
    truncated: event.target_response_truncated,
    verdict: event.verdict,
    score: event.score,
    canaryTriggered: event.canary_triggered,
    flagToken: event.flag_token,
    error: event.error,
  };

  if (prev.some(x => x.key === key)) {
    return prev.map(x => (x.key === key ? { ...x, response } : x));
  }
  return [...prev, {
    key,
    objectiveId: event.objective_id,
    atlas: event.atlas,
    atlasName: event.atlas_name,
    generation: event.generation,
    mutationOp: event.mutation_op,
    attackPrompt: event.attack_prompt,
    attackTruncated: event.attack_prompt_truncated,
    response,
  }];
}

const CIRCLED = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];

/** 목표 순번을 ①②③…로. 10을 넘으면 그냥 숫자. */
function circled(n: number): string {
  return CIRCLED[n - 1] ?? `${n}`;
}

/** ATLAS 코드 → 표시명. 로컬 매핑 우선, 없으면 백엔드가 준 이름, 그것도 없으면 코드. */
function techniqueName(atlas: string, atlasName: string): string {
  return ATLAS_LABELS[atlas] ?? atlasName ?? atlas;
}

/** 세대 태그: 씨앗은 'seed', 변이는 'gen N · op'. 백엔드 generation은 0-based(0=씨앗). */
function genTag(generation: number, mutationOp: string): string {
  return generation === 0 ? 'seed' : `gen ${generation} · ${mutationOp}`;
}

const VERDICT_STYLE: Record<ScanVerdict, { cls: string; label: string }> = {
  safe:   { cls: styles.def, label: '🛡️ 방어 성공' },
  breach: { cls: styles.brc, label: '⚠ 돌파됨' },
  error:  { cls: styles.err, label: '⚠ 응답 오류' },
};

/** 응답 안의 카나리(FLAG)를 하이라이트해 렌더. 토큰이 없으면 원문 그대로. */
function highlightFlag(text: string, flagToken: string | null) {
  if (!flagToken) return text;
  const at = text.indexOf(flagToken);
  if (at < 0) return text;
  return (
    <>
      {text.slice(0, at)}
      <span className={styles.flag}>{flagToken}</span>
      {text.slice(at + flagToken.length)}
    </>
  );
}

interface Props {
  exchanges: ChatExchange[];
  /** 스캔 상태 — running일 때만 LIVE 펄스/푸터 표시 */
  status: 'idle' | 'running' | 'done' | 'failed';
  targetName: string;
  /** 정찰(recon)에서 온 표적 프로파일. 정찰 전이면 null */
  recon: { tools: string[]; defenses: string[] } | null;
  /** 진화 엔진 현재 세대(progress phase=evolve) */
  generation: number;
  /** 목표 커버리지 — 완료/전체 */
  objectivesDone: number;
  objectivesTotal: number;
}

/**
 * 실시간 공격 채팅 — 레드팀 공격(우)↔타깃 응답(좌)을 사람이 읽는 형태로 표시.
 *
 * 표시 전용 컴포넌트. 이벤트 구독은 RunScanPage의 기존 EventSource가 담당하고,
 * 여기는 applyAttemptEvent로 만들어진 교환 목록을 받아 그리기만 한다.
 */
export function LiveAttackChat({
  exchanges, status, targetName, recon, generation, objectivesDone, objectivesTotal,
}: Props) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [exchanges]);

  const answered = exchanges.filter(x => x.response !== null);
  const breached = answered.filter(x => x.response!.verdict === 'breach').length;
  const defended = answered.filter(x => x.response!.verdict === 'safe').length;
  const coverage = objectivesTotal > 0
    ? Math.round((objectivesDone / objectivesTotal) * 100)
    : 0;

  // 목표 전환(구분선) / 세대 전환(변이 마커) 판정을 위한 직전 값
  let prevObjective: number | null = null;
  let prevGeneration: number | null = null;
  let objectiveNo = 0;

  return (
    <section className={styles.chat}>
      <div className={styles.barTitle}>
        <div className={styles.dots}>
          <span className={`${styles.dot} ${styles.dg}`} />
          <span className={`${styles.dot} ${styles.dy}`} />
          <span className={`${styles.dot} ${styles.dgr}`} />
        </div>
        <span>redi@console — Live Attack Chat</span>
        {status === 'running'
          ? <span className={styles.live}><span className={styles.pulseDot} />LIVE</span>
          : <span className={styles.idle}>{status === 'idle' ? '대기 중' : '종료됨'}</span>}
      </div>

      <div className={styles.chatSub}>
        <span className={styles.tg}>🎯 {targetName}</span>
        <span className={styles.sep}>·</span>
        {recon ? (
          <>
            <span>tools: {recon.tools.length ? recon.tools.join(', ') : 'none'}</span>
            <span className={styles.sep}>·</span>
            <span>defenses: {recon.defenses.length ? recon.defenses.join(', ') : 'none'}</span>
          </>
        ) : (
          <span>정찰 중…</span>
        )}
        <span className={styles.sep}>·</span>
        <span>공격 프롬프트 영어 통일</span>
      </div>

      {/* 실시간으로 늘어나는 영역 — 보조기술이 새 공격·응답을 인지하도록 log 라이브 리전으로 */}
      <div className={styles.thread} role="log" aria-live="polite" aria-label="실시간 공격 채팅">
        {exchanges.length === 0 && (
          <p className={styles.empty}>
            스캔을 시작하면 공격과 응답이 실시간으로 표시됩니다.
          </p>
        )}

        {exchanges.map(x => {
          const newObjective = x.objectiveId !== prevObjective;
          if (newObjective) {
            prevObjective = x.objectiveId;
            prevGeneration = null;
            objectiveNo += 1;
          }
          const newGeneration = x.generation !== prevGeneration;
          const showGenmark = !newObjective && newGeneration && x.generation > 0;
          prevGeneration = x.generation;

          const verdict = x.response ? VERDICT_STYLE[x.response.verdict] : null;

          return (
            <Fragment key={x.key}>
              {newObjective && (
                <div className={styles.divider}>
                  목표 {circled(objectiveNo)} · <b>{techniqueName(x.atlas, x.atlasName)}</b>
                  {' '}— {x.atlas}
                </div>
              )}
              {showGenmark && (
                <div className={styles.genmark}>
                  ↻ 변이 적용 — {x.mutationOp} · gen {x.generation}
                </div>
              )}

              <div className={`${styles.msg} ${styles.atk}`}>
                <div className={styles.meta}>
                  <span className={styles.who}>RED TEAM</span>
                  <span className={`${styles.tag} ${styles.tech}`}>{x.atlas}</span>
                  <span className={styles.tag}>{genTag(x.generation, x.mutationOp)}</span>
                </div>
                <div className={styles.bubble}>{x.attackPrompt}</div>
                {x.attackTruncated && <p className={styles.truncated}>… 프롬프트가 잘렸습니다</p>}
              </div>

              <div className={`${styles.msg} ${styles.tgt}`}>
                <div className={styles.meta}>
                  <span className={styles.who}>TARGET</span>
                  {!x.response && <span className={styles.tag}>응답 대기</span>}
                </div>
                <div className={styles.bubble}>
                  {x.response
                    ? highlightFlag(x.response.text, x.response.flagToken)
                    : <span className={styles.typing}><i /><i /><i /></span>}
                </div>
                {x.response?.truncated && <p className={styles.truncated}>… 응답이 잘렸습니다</p>}
                {x.response && verdict && (
                  <div className={`${styles.verdict} ${verdict.cls}`}>
                    {verdict.label}
                    <span className={styles.sc}>
                      {x.response.verdict === 'error'
                        ? (x.response.error ?? '대상 서버 응답 없음')
                        : `fitness ${x.response.score.toFixed(2)}`}
                    </span>
                  </div>
                )}
                {x.response?.canaryTriggered && (
                  <div className={styles.canary}>
                    🚩 <b>카나리 트리거</b> — 심어둔 FLAG 토큰이 응답에 노출됐습니다.
                    finding으로 기록됩니다.
                  </div>
                )}
              </div>
            </Fragment>
          );
        })}
        <div ref={endRef} />
      </div>

      <div className={styles.chatFoot}>
        {status === 'running' && <span className={styles.livedot} />}
        <span className={styles.st}>
          {status !== 'running'
            ? <>진화 엔진 · <b>{answered.length}</b>회 시도 완료</>
            /* 진화 progress가 오기 전(씨앗 발사 중)엔 generation이 0 — 'gen 0'은 노출하지 않는다 */
            : generation === 0
              ? <>진화 엔진 · <b>씨앗</b> 세대 발사 중</>
              : <>진화 엔진 · <b>gen {generation}</b> 진행 중</>}
        </span>
        <span className={styles.push}>
          <span className={styles.m}>시도 <span className={styles.n}>{exchanges.length}</span></span>
          <span className={styles.m}>돌파 <span className={`${styles.n} ${styles.r}`}>{breached}</span></span>
          <span className={styles.m}>방어 <span className={`${styles.n} ${styles.g}`}>{defended}</span></span>
          <span className={styles.m}>커버리지 <span className={styles.n}>{coverage}%</span></span>
        </span>
      </div>
    </section>
  );
}
