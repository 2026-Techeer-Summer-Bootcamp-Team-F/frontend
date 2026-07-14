/**
 * AttackSimulation — 공격 시뮬레이션 모달
 *
 * [SIMULATION] 이 파일을 삭제하면 기능이 완전히 제거됩니다.
 * ReportPage.tsx 에서 [SIMULATION] 주석 3곳도 함께 제거하세요.
 */
import { createPortal } from 'react-dom';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getProject } from '../../api/projects';
import type { Finding } from '../../api/scans';
import styles from './AttackSimulation.module.css';

type Phase = 'idle' | 'typing_prompt' | 'waiting' | 'typing_response' | 'done';

const CHAR_INTERVAL = 28;   // 타이핑 속도 (ms/글자)
const SEND_DELAY    = 600;  // 전송 후 응답 대기 (ms)

function deriveUiUrl(apiUrl: string): string {
  // http://host.docker.internal:8100/chat → http://localhost:8100/
  return apiUrl
    .replace('host.docker.internal', 'localhost')
    .replace(/\/[^/]+$/, '/');
}

interface Props {
  finding: Finding;
  targetId: number;
  onClose: () => void;
}

export function AttackSimulation({ finding, targetId, onClose }: Props) {
  const [uiUrl, setUiUrl]             = useState('');
  const [iframeReady, setIframeReady] = useState(false);
  const [phase, setPhase]             = useState<Phase>('idle');
  const [promptText, setPromptText]   = useState('');
  const [responseText, setResponseText] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // 타겟 UI URL 로딩
  useEffect(() => {
    getProject(targetId)
      .then(p => setUiUrl(deriveUiUrl(p.config?.url ?? '')))
      .catch(() => setUiUrl(''));
  }, [targetId]);

  // 채팅 영역 자동 스크롤
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [promptText, responseText]);

  // Esc 닫기
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const clearTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const typeText = useCallback(
    (full: string, setter: (t: string) => void, onDone: () => void) => {
      let idx = 0;
      const tick = () => {
        idx++;
        setter(full.slice(0, idx));
        if (idx < full.length) {
          timerRef.current = setTimeout(tick, CHAR_INTERVAL);
        } else {
          onDone();
        }
      };
      timerRef.current = setTimeout(tick, CHAR_INTERVAL);
    },
    [],
  );

  const startSimulation = useCallback(() => {
    clearTimer();
    setPromptText('');
    setResponseText('');
    setPhase('typing_prompt');

    typeText(finding.evidence.prompt, setPromptText, () => {
      setPhase('waiting');
      timerRef.current = setTimeout(() => {
        setPhase('typing_response');
        typeText(finding.evidence.response, setResponseText, () => {
          setPhase('done');
        });
      }, SEND_DELAY);
    });
  }, [finding, typeText]);

  useEffect(() => () => clearTimer(), []);

  const statusLabel: Record<Phase, string> = {
    idle:            '시작 버튼을 눌러 공격을 재현합니다',
    typing_prompt:   '공격 프롬프트 주입 중...',
    waiting:         '응답 대기 중...',
    typing_response: '모델 응답 수신 중...',
    done:            '시뮬레이션 완료',
  };

  const showPrompt   = phase !== 'idle';
  const showResponse = phase === 'typing_response' || phase === 'done';
  const promptDone   = phase === 'waiting' || phase === 'typing_response' || phase === 'done';
  const responseDone = phase === 'done';

  return createPortal(
    <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.modal}>
        {/* 헤더 */}
        <div className={styles.header}>
          <div className={styles.dots}>
            <span className={`${styles.dot} ${styles.dotR}`} />
            <span className={`${styles.dot} ${styles.dotY}`} />
            <span className={`${styles.dot} ${styles.dotG}`} />
          </div>
          <span className={styles.headerTitle}>
            attack_simulation.live — {finding.title}
          </span>
          <span className={styles.headerBadge}>{finding.severity.toUpperCase()}</span>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        {/* 콘텐츠 */}
        <div className={styles.content}>
          {/* 실제 타겟 앱 iframe */}
          <div className={styles.iframeWrap}>
            {!iframeReady && (
              <div className={styles.iframeLoading}>
                <span>█</span> 타겟 앱 로딩 중...
              </div>
            )}
            {uiUrl ? (
              <iframe
                src={uiUrl}
                className={styles.iframe}
                title="target-app"
                onLoad={() => setIframeReady(true)}
                sandbox="allow-scripts allow-same-origin allow-forms"
              />
            ) : (
              <div className={styles.iframeLoading}>타겟 URL을 불러오는 중...</div>
            )}
          </div>

          {/* 공격 재현 패널 */}
          <div className={styles.attackPanel}>
            <div className={styles.panelHeader}>
              {phase !== 'idle' && phase !== 'done' && <span className={styles.panelDot} />}
              <span className={styles.panelTitle}>ATTACK REPLAY</span>
            </div>

            <div className={styles.chat}>
              {showPrompt && (
                <div className={`${styles.bubbleWrap} ${styles.bubbleAttacker}`}>
                  <span className={styles.bubbleLabel}>ATTACKER</span>
                  <div className={styles.bubble}>
                    {promptText}
                    {!promptDone && <span className={styles.cursor} />}
                  </div>
                </div>
              )}
              {showResponse && (
                <div className={`${styles.bubbleWrap} ${styles.bubbleTarget}`}>
                  <span className={styles.bubbleLabel}>TARGET MODEL</span>
                  <div className={styles.bubble}>
                    {responseText}
                    {!responseDone && <span className={styles.cursor} />}
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className={styles.controls}>
              <span className={styles.statusText}>{statusLabel[phase]}</span>
              {phase === 'idle' && (
                <button className={styles.startBtn} onClick={startSimulation}>
                  ▶ 시뮬레이션 시작
                </button>
              )}
              {phase === 'done' && (
                <button className={styles.replayBtn} onClick={startSimulation}>
                  ↺ 다시 보기
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
