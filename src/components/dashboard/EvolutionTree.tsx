import type { Attempt } from '../../types';

interface Props {
  attempts: Attempt[];
}

export function EvolutionTree({ attempts }: Props) {
  const roots = attempts.filter((a) => a.parent_attempt_id === null);
  const childrenOf = (id: number) => attempts.filter((a) => a.parent_attempt_id === id);

  const renderNode = (attempt: Attempt, depth: number = 0): React.ReactNode => (
    <li key={attempt.id} style={{ marginLeft: depth * 16 }}>
      <span>
        세대 {attempt.generation} | {attempt.mutation_operator ?? 'seed'} | fitness{' '}
        {attempt.fitness.toFixed(3)} {attempt.success && '✅'}
      </span>
      <ul>{childrenOf(attempt.id).map((child) => renderNode(child, depth + 1))}</ul>
    </li>
  );

  return (
    <section>
      <h2>진화 트리</h2>
      <ul>{roots.map((root) => renderNode(root))}</ul>
    </section>
  );
}
