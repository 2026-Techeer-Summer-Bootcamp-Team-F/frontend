import { useState } from 'react';
import { Brand } from '../components/Brand';
import { getGitHubLoginUrl } from '../api/auth';
import styles from './GuidePage.module.css';

const STEPS = [
  {
    num: '01',
    title: 'GitHub 연결',
    desc: 'GitHub OAuth로 로그인하면 본인 계정의 레포지토리 목록을 불러옵니다. 별도 설치나 설정 없이 버튼 한 번으로 연결됩니다.',
    img: '/guide/01-github.png',
  },
  {
    num: '02',
    title: '레포지토리 선택',
    desc: '분석할 AI 앱이 있는 레포를 고릅니다. 공개·비공개 모두 지원하며, 언제든 다른 레포로 교체할 수 있습니다.',
    img: '/guide/02-repos.png',
  },
  {
    num: '03',
    title: '필요 정보 입력',
    desc: '스캔 대상 AI 앱의 엔드포인트와 접속 정보를 입력합니다. 레포를 고르면 요청·응답 형태를 자동으로 감지해 채워줍니다. 단, 앱이 인터넷에 배포돼 공개 URL로 접속 가능해야 스캔할 수 있어요 — 로컬에서 개발 중이라면 ngrok·cloudflared 터널로 노출하세요.',
    img: '/guide/04-register.png',
  },
  {
    num: '04',
    title: '스캔 & 리포트',
    desc: 'MITRE ATLAS 기반 실전 공격 데이터를 자동 실행하고 결과를 실시간으로 스트리밍합니다. 완료 후 취약점 분류·심각도·증거까지 리포트로 제공합니다.',
    img: '/guide/05-report.png',
  },
];

export function GuidePage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [current, setCurrent] = useState(0);   // 슬라이드 현재 스텝(0-based)
  const step = STEPS[current];
  const isLast = current === STEPS.length - 1;

  const handleStart = async () => {
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
      <nav className={styles.topbar}>
        <Brand to="/" />
      </nav>

      <header className={styles.header}>
        <p className={styles.badge}>
          <span className={styles.badgeLabel}>WELCOME</span>
          <span className={styles.badgeDot}>·</span>
          <span>시작 전 안내</span>
        </p>
        <p className={styles.sub}>
          GitHub 저장소만 있으면 바로 시작할 수 있습니다.
          <br />
          아래 흐름을 확인하고 연결하세요.
        </p>
      </header>

      {/* ── 슬라이드(한 스텝씩 '다음'으로 넘김) ── */}
      <section className={styles.carousel}>
        <div className={styles.card}>
          <div className={styles.macBar}>
            <div className={styles.macDots}>
              <span className={`${styles.macDot} ${styles.macG}`} />
              <span className={`${styles.macDot} ${styles.macY}`} />
              <span className={`${styles.macDot} ${styles.macR}`} />
            </div>
            <span className={styles.macTitle}>STEP {step.num} / {STEPS.length}</span>
          </div>
          <div className={styles.cardBody}>
            <span className={styles.stepNum}>{step.num}</span>
            <p className={styles.stepTitle}>{step.title}</p>
            <p className={styles.stepDesc}>{step.desc}</p>
            {step.img && (
              <div className={styles.screenshotWrap}>
                <img src={step.img} alt={step.title} className={styles.screenshot} />
              </div>
            )}
          </div>
        </div>

        {/* 페이지 점 */}
        <div className={styles.dots}>
          {STEPS.map((_, i) => (
            <button
              key={i}
              className={`${styles.dot} ${i === current ? styles.dotActive : ''}`}
              onClick={() => setCurrent(i)}
              aria-label={`${i + 1}단계로`}
            />
          ))}
        </div>

        {/* 이전 / 다음 (슬라이드 이동만) */}
        <div className={styles.slideNav}>
          <button
            className={styles.navBtn}
            onClick={() => setCurrent(c => Math.max(0, c - 1))}
            disabled={current === 0}
          >
            ← 이전
          </button>
          <button
            className={styles.navBtn}
            onClick={() => setCurrent(c => Math.min(STEPS.length - 1, c + 1))}
            disabled={isLast}
          >
            다음 →
          </button>
        </div>
      </section>

      {/* GitHub 시작 — 항상 하단에 따로. 슬라이드 다 안 넘겨도 바로 시작 가능 */}
      <footer className={styles.footer}>
        {error && (
          <p className={styles.errorMsg}>
            서버에 연결할 수 없습니다. 백엔드가 실행 중인지 확인해주세요.
          </p>
        )}
        <button className={styles.cta} onClick={handleStart} disabled={loading}>
          <svg className={styles.ctaIcon} viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.807 5.625-5.479 5.921.43.372.823 1.102.823 2.222 0 1.606-.015 2.898-.015 3.293 0 .319.216.694.825.576C20.565 21.796 24 17.298 24 12c0-6.63-5.37-12-12-12z" />
          </svg>
          {loading ? '연결 중...' : 'GitHub로 시작하기'}
        </button>
      </footer>
    </div>
  );
}
