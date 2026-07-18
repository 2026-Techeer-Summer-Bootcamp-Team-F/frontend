import type { PropsWithChildren } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Brand } from '../Brand';
import { logout } from '../../api/auth';
import { removeToken } from '../../utils/auth';
import styles from './AppLayout.module.css';

export function AppLayout({ children }: PropsWithChildren) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try { await logout(); } catch { /* 무시 */ }
    removeToken();
    navigate('/');
  };

  return (
    <div className={styles.shell}>
      <header className={`${styles.nav} pdf-hide`}>
        <Brand to="/repos" />

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
