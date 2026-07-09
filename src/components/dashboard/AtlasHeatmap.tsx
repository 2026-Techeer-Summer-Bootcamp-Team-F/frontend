import type { Finding } from '../../types';

interface Props {
  findings: Finding[];
}

const ATLAS_LABELS: Record<string, string> = {
  T0051: 'Develop Capabilities',
  T0054: 'Gather Victim Identity',
  T0057: 'Elicit Victim Submission',
};

export function AtlasHeatmap({ findings }: Props) {
  const counts: Record<string, number> = {};
  for (const finding of findings) {
    for (const id of finding.atlas_technique_ids) {
      counts[id] = (counts[id] ?? 0) + 1;
    }
  }

  const maxCount = Math.max(...Object.values(counts), 1);

  return (
    <section>
      <h2>ATLAS 히트맵</h2>
      <ul>
        {Object.entries(counts).map(([id, count]) => (
          <li key={id}>
            <span>{id} — {ATLAS_LABELS[id] ?? id}</span>
            <meter value={count} max={maxCount} />
            <span>{count}건</span>
          </li>
        ))}
      </ul>
      {Object.keys(counts).length === 0 && <p>뚫린 기법 없음</p>}
    </section>
  );
}
