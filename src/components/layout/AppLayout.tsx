import type { PropsWithChildren } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styles from './AppLayout.module.css';

export function AppLayout({ children }: PropsWithChildren) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    navigate('/');
  };

  return (
    <div className={styles.shell}>
      <header className={styles.nav}>
        <Link to="/repos" className={styles.logo}>
          <span className={styles.logoPrompt}>&gt;_</span>
          <span className={styles.logoName}>redi</span>
        </Link>

        <nav className={styles.navLinks}>
          <Link to="/repos" className={styles.navLink}>프로젝트</Link>
        </nav>

        <button className={styles.logoutBtn} onClick={handleLogout}>
          로그아웃
        </button>
      </header>

      <main className={styles.main}>{children}</main>
    </div>
  );
}
