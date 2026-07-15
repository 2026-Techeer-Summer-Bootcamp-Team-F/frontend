import { ATLAS_LABELS } from '../../shared/constants';
import type { ChatExchange } from './LiveAttackChat';
import styles from './AttackSessionList.module.css';

interface Session {
  objectiveId: number;
  atlas: string;
  atlasName: string;
  attempts: number;
  breached: number;
  pending: boolean;
}

function deriveSessions(exchanges: ChatExchange[]): Session[] {
  const map = new Map<number, Session>();
  for (const x of exchanges) {
    const s = map.get(x.objectiveId) ?? {
      objectiveId: x.objectiveId,
      atlas: x.atlas,
      atlasName: x.atlasName,
      attempts: 0,
      breached: 0,
      pending: false,
    };
    s.attempts += 1;
    if (x.response === null) s.pending = true;
    if (x.response?.verdict === 'breach') s.breached += 1;
    map.set(x.objectiveId, { ...s });
  }
  return Array.from(map.values());
}

interface Props {
  exchanges: ChatExchange[];
  selected: number | null;
  onSelect: (objectiveId: number) => void;
  newSessions: Set<number>;
  status: 'idle' | 'running' | 'done' | 'failed';
}

export function AttackSessionList({ exchanges, selected, onSelect, newSessions, status }: Props) {
  const sessions = deriveSessions(exchanges);

  return (
    <div className={styles.list}>
      <div className={styles.header}>
        <span className={styles.title}>SESSIONS</span>
        {sessions.length > 0 && (
          <span className={styles.badge}>{sessions.length}</span>
        )}
        {status === 'running' && <span className={styles.live}><span className={styles.pulseDot} />LIVE</span>}
      </div>

      <div className={styles.items}>
        {sessions.length === 0 ? (
          <p className={styles.empty}>
            스캔이 시작되면<br />공격 기법별 세션이<br />자동 생성됩니다.
          </p>
        ) : (
          <>
            {sessions.map(s => {
              const name = ATLAS_LABELS[s.atlas] ?? s.atlasName ?? s.atlas;
              const isActive = selected === s.objectiveId;
              const dotCls = s.breached > 0
                ? styles.dotBreach
                : s.pending
                  ? styles.dotPending
                  : styles.dotSafe;
              const statusLabel = s.breached > 0 ? '뚫림' : s.pending ? '진행' : '방어';
              const statusCls = s.breached > 0
                ? styles.tagBreach
                : s.pending
                  ? styles.tagPending
                  : styles.tagSafe;

              return (
                <button
                  key={s.objectiveId}
                  className={`${styles.item} ${isActive ? styles.active : ''}`}
                  onClick={() => onSelect(s.objectiveId)}
                >
                  <span className={`${styles.dot} ${dotCls}`} />
                  <div className={styles.itemBody}>
                    <span className={styles.itemAtlas}>{s.atlas}</span>
                    <span className={styles.itemName}>{name}</span>
                  </div>
                  <div className={styles.itemRight}>
                    {newSessions.has(s.objectiveId) && (
                      <span className={styles.newDot} title="새 세션" />
                    )}
                    <span className={`${styles.statusTag} ${statusCls}`}>{statusLabel}</span>
                    <span className={styles.itemCount}>{s.attempts}</span>
                  </div>
                </button>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
