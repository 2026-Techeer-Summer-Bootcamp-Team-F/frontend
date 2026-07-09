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

          <a href={getGitHubLoginUrl()} className={styles.cta}>
            <span className={styles.ctaPrompt}>&gt;_</span>
            {'  '}GitHub로 시작하기
          </a>
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
