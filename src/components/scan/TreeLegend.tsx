import { VERDICT_COLOR, MUTATION_LINE_COLOR } from '../../shared/constants';
import styles from './TreeLegend.module.css';

const NODE_ITEMS = [
  { color: VERDICT_COLOR.seed_pool, label: 'SEED POOL' },
  { color: VERDICT_COLOR.breached,  label: '침투 성공' },
  { color: VERDICT_COLOR.safe,      label: '방어됨' },
  { color: VERDICT_COLOR.error,     label: '오류' },
] as const;

export function TreeLegend() {
  return (
    <div className={styles.legend}>
      <div className={styles.group}>
        {NODE_ITEMS.map(({ color, label }) => (
          <span key={label} className={styles.item}>
            <i className={styles.dot} style={{ background: color }} />
            {label}
          </span>
        ))}
      </div>
      <div className={styles.group}>
        {Object.entries(MUTATION_LINE_COLOR).map(([op, color]) => (
          <span key={op} className={styles.item}>
            <i className={styles.line} style={{ background: color }} />
            {op}
          </span>
        ))}
      </div>
    </div>
  );
}
