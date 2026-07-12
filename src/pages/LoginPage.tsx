import { useState } from 'react';
import { getGitHubLoginUrl } from '../api/auth';
import styles from './LoginPage.module.css';

const KEYWORD_CLOUD = [
  { text: 'ANALYZE',            x: 57, y: 10, opacity: 0.22 },
  { text: '0x40 AM.',           x: 70, y: 16, opacity: 0.16 },
  { text: 'LOAD',               x: 22, y: 22, opacity: 0.30 },
  { text: 'T0054',              x: 29, y: 29, opacity: 0.36 },
  { text: '.31 PRIVESC',        x: 61, y: 27, opacity: 0.19 },
  { text: '25 ADVERSARIAL',     x: 20, y: 39, opacity: 0.26 },
  { text: 'HALLUCINATE',        x: 63, y: 38, opacity: 0.20 },
  { text: 'PAYLOAD',            x: 16, y: 51, opacity: 0.32 },
  { text: 'RATE LIMIT',         x: 59, y: 50, opacity: 0.23 },
  { text: 'SANDBOX',            x: 14, y: 62, opacity: 0.29 },
  { text: 'INJECTION',          x: 60, y: 63, opacity: 0.21 },
  { text: 'REFUSAL BYPASS',     x: 28, y: 74, opacity: 0.20 },
  { text: 'EXFILTRATE',         x: 58, y: 76, opacity: 0.18 },
  { text: 'LEAK  BASE64  PAYLOAD', x: 22, y: 86, opacity: 0.24 },
];

export function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const handleGitHubLogin = async () => {
    setLoading(true);
    setError(false);
    try {
      const url = await getGitHubLoginUrl();
      window.location.href = url;
    } catch {
      setLoading(false);
      setError(true);
    }
  };

  return (
    <div className={styles.page}>
      {/* ── Hero ── */}
      <section className={styles.hero}>
        {/* Keyword cloud */}
        <div className={styles.cloud} aria-hidden="true">
          {KEYWORD_CLOUD.map(({ text, x, y, opacity }) => (
            <span
              key={text}
              className={styles.cloudWord}
              style={{ left: `${x}%`, top: `${y}%`, opacity }}
            >
              {text}
            </span>
          ))}
        </div>

        {/* Raccoon mascot */}
        <img
          className={styles.mascot}
          src="/raccoon.png"
          alt="Hackie 마스코트"
          draggable={false}
        />

        {/* Text block */}
        <div className={styles.heroContent}>
          <p className={styles.badge}>
            <span className={styles.badgeLabel}>OPEN SOURCE</span>
            <span className={styles.badgeDot}>·</span>
            <span>저장소만 연결하면 끝</span>
          </p>

          <h1 className={styles.headline}>
            AI 앱이 실제로
            <br />
            뚫리는지{' '}
            <span className={styles.accent}>확인하세요</span>
          </h1>

          <p className={styles.description}>
            프롬프트 인젝션·탈옥·데이터 유출까지, 실전 공격 코퍼스로 자동 진단.
            <br />
            GitHub 저장소를 연결하면 바로 시작합니다.
          </p>

          {error && (
            <p style={{ color: '#ff6b6b', fontFamily: 'monospace', fontSize: '0.85rem', marginBottom: '8px' }}>
              서버에 연결할 수 없습니다. 백엔드가 실행 중인지 확인해주세요.
            </p>
          )}
          <button className={styles.cta} onClick={handleGitHubLogin} disabled={loading}>
            <svg className={styles.ctaIcon} viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.807 5.625-5.479 5.921.43.372.823 1.102.823 2.222 0 1.606-.015 2.898-.015 3.293 0 .319.216.694.825.576C20.565 21.796 24 17.298 24 12c0-6.63-5.37-12-12-12z" />
            </svg>
            GitHub로 시작하기
          </button>
        </div>
      </section>

      {/* ── Quick Start ── */}
      <section className={styles.quickstart}>
        <p className={styles.sectionLabel}>QUICK START</p>

        <div className={styles.terminal}>
          {/* Title bar */}
          <div className={styles.titlebar}>
            <div className={styles.dots}>
              <span className={`${styles.dot} ${styles.dotGreen}`} />
              <span className={`${styles.dot} ${styles.dotYellow}`} />
              <span className={`${styles.dot} ${styles.dotGray}`} />
            </div>
            <span className={styles.termTitle}>redi@console — bash — 온보딩</span>
          </div>

          {/* Terminal body */}
          <div className={styles.termBody}>
            <p className={styles.termLine}>
              <span className={styles.prompt}>redi@console:~$</span>
              <span className={styles.cmd}> redi init</span>
            </p>

            <p className={styles.termOutput}>
              <span className={styles.check}>✓</span>
              <span className={styles.termKey}> AI 레드팀 콘솔</span>
              <span className={styles.termSpacer}>  </span>
              <span className={styles.termVal}>v0.9</span>
            </p>
            <p className={styles.termOutput}>
              <span className={styles.check}>✓</span>
              <span className={styles.termKey}> 실전 공격 코퍼스</span>
              <span className={styles.termSpacer}>  </span>
              <span className={styles.termVal}>12,480 payloads</span>
            </p>
            <p className={styles.termOutput}>
              <span className={styles.check}>✓</span>
              <span className={styles.termKey}> MITRE ATLAS 매핑</span>
              <span className={styles.termSpacer}>  </span>
              <span className={styles.termVal}>14 tactics</span>
            </p>

            <p className={styles.termLine}>
              <span className={styles.prompt}>redi@console:~$</span>
              <span className={styles.cmd}> redi connect --github</span>
              <span className={styles.cursor} aria-hidden="true" />
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
