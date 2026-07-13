import { useNavigate } from 'react-router-dom';
import { Brand } from '../components/Brand';
import styles from './LoginPage.module.css';

export function LoginPage() {
  const navigate = useNavigate();

  const handleGitHubLogin = () => navigate('/guide');

  return (
    <div className={styles.page}>
      {/* ── Top nav ── */}
      <nav className={styles.nav}>
        <Brand to="/" />
      </nav>

      {/* ── Hero ── */}
      <section className={styles.hero}>
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
            <span className={styles.badgeLabel}>AI RED TEAM</span>
            <span className={styles.badgeDot}>·</span>
            <span>저장소만 연결하면 끝</span>
          </p>

          <h1 className={styles.headline}>
            실제 공격으로 AI <span className={styles.accent}>취약점</span>을 찾아냅니다
          </h1>

          <p className={styles.description}>
            프롬프트 인젝션·탈옥·데이터 유출까지, 실제 공격 패턴으로 자동 진단.
            <br />
            GitHub 저장소를 연결하면 바로 시작합니다.
          </p>

          <button className={styles.cta} onClick={handleGitHubLogin}>
            <svg className={styles.ctaIcon} viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.807 5.625-5.479 5.921.43.372.823 1.102.823 2.222 0 1.606-.015 2.898-.015 3.293 0 .319.216.694.825.576C20.565 21.796 24 17.298 24 12c0-6.63-5.37-12-12-12z" />
            </svg>
            GitHub로 시작하기
          </button>
        </div>
      </section>

      {/* ── 시스템 상태 (터미널) ── */}
      <section className={styles.quickstart}>
        <p className={styles.sectionLabel}>SYSTEM STATUS</p>

        <div className={styles.terminal}>
          {/* Title bar */}
          <div className={styles.titlebar}>
            <div className={styles.dots}>
              <span className={`${styles.dot} ${styles.dotGreen}`} />
              <span className={`${styles.dot} ${styles.dotYellow}`} />
              <span className={`${styles.dot} ${styles.dotGray}`} />
            </div>
            <span className={styles.termTitle}>redi@console — redteam</span>
          </div>

          {/* Terminal body */}
          <div className={styles.termBody}>
            <p className={styles.termLine}>
              <span className={styles.prompt}>redi@console:~$</span>
              <span className={styles.cmd}> redi status</span>
            </p>

            <p className={styles.termOutput}>
              <span className={styles.check}>✓</span>
              <span className={styles.termKey}> AI 레드팀 엔진</span>
              <span className={styles.termSpacer}>  </span>
              <span className={styles.termVal}>온라인</span>
            </p>
            <p className={styles.termOutput}>
              <span className={styles.check}>✓</span>
              <span className={styles.termKey}> 실전 공격 데이터</span>
              <span className={styles.termSpacer}>  </span>
              <span className={styles.termVal}>수만 건</span>
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
