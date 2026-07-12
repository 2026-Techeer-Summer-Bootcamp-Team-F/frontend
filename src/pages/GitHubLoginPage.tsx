import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './GitHubLoginPage.module.css';

export function GitHubLoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('username and password required');
      return;
    }
    setError(null);
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      navigate('/repos');
    }, 1200);
  };

  return (
    <div className={styles.page}>
      <div className={styles.scanlines} aria-hidden="true" />

      <div className={styles.terminal}>
        {/* Title bar */}
        <div className={styles.titlebar}>
          <div className={styles.dots}>
            <span className={`${styles.dot} ${styles.g}`} />
            <span className={`${styles.dot} ${styles.y}`} />
            <span className={`${styles.dot} ${styles.r}`} />
          </div>
          <span className={styles.titleText}>redi@console — github.com/login</span>
        </div>

        {/* Body */}
        <div className={styles.body}>
          <div className={styles.logo}>
            <svg viewBox="0 0 98 96" className={styles.octocat} aria-label="GitHub">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z"
              />
            </svg>
          </div>

          <h1 className={styles.heading}>Sign in to GitHub</h1>

          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="username">
                <span className={styles.prompt}>›</span> Username or email address
              </label>
              <input
                id="username"
                className={styles.input}
                type="text"
                autoComplete="username"
                autoFocus
                value={username}
                onChange={e => setUsername(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="password">
                <span className={styles.prompt}>›</span> Password
              </label>
              <input
                id="password"
                className={styles.input}
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>

            {error && (
              <p className={styles.error}>
                <span className={styles.errorIcon}>✗</span> {error}
              </p>
            )}

            <button className={styles.submitBtn} type="submit" disabled={loading}>
              {loading ? (
                <span className={styles.loadingRow}>
                  <span className={styles.blink}>█</span> authenticating...
                </span>
              ) : (
                <span className={styles.loadingRow}>
                  <svg className={styles.btnIcon} viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.807 5.625-5.479 5.921.43.372.823 1.102.823 2.222 0 1.606-.015 2.898-.015 3.293 0 .319.216.694.825.576C20.565 21.796 24 17.298 24 12c0-6.63-5.37-12-12-12z" />
                  </svg>
                  Sign in
                </span>
              )}
            </button>
          </form>

          <div className={styles.divider}>
            <span className={styles.dividerLine} />
            <span className={styles.dividerText}>OR</span>
            <span className={styles.dividerLine} />
          </div>

          <button className={styles.backBtn} onClick={() => navigate('/')}>
            ← Hackie 홈으로
          </button>
        </div>
      </div>
    </div>
  );
}
