import { Link } from 'react-router-dom';
import styles from './Brand.module.css';

// 공통 브랜드 로고(REDI 라쿤 + 워드마크). 클릭 시 to 경로로 이동.
// 온보딩·가이드 = to="/", 로그인 후 셸 = to="/repos".
export function Brand({ to = '/' }: { to?: string }) {
  return (
    <Link to={to} className={styles.brand} aria-label="처음 화면으로">
      <img className={styles.logo} src="/logo-redi.png" alt="REDI 로고" draggable={false} />
      <span className={styles.name}>REDI</span>
    </Link>
  );
}
