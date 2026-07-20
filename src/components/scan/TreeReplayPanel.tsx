import { useEffect, useMemo, useState } from 'react';
import { EvolutionTreePanel } from './EvolutionTreePanel';
import type { EvolutionNode } from '../../api/scans';
import { atlasLabel } from '../../shared/constants';
import styles from './TreeReplayPanel.module.css';

interface Props {
  nodes: EvolutionNode[];
  atlasId: string;
  atlasName: string;
  status: 'idle' | 'running' | 'done' | 'failed';
}

export function TreeReplayPanel({ nodes, atlasId, atlasName, status }: Props) {
  const [step, setStep] = useState<number | null>(null);

  const sortedNodes = useMemo(
    () => [...nodes].sort((a, b) => a.attempt_id - b.attempt_id),
    [nodes],
  );

  useEffect(() => { setStep(null); }, [atlasId]);
  useEffect(() => { if (status === 'idle') setStep(null); }, [status]);

  const isReplay = status !== 'running' && sortedNodes.length > 0;
  const maxStep = sortedNodes.length - 1;
  const currentStep = step ?? maxStep;
  const visibleNodes = isReplay ? sortedNodes.slice(0, currentStep + 1) : nodes;

  const currentNode = sortedNodes[currentStep];
  const thinkingText = currentNode?.improvement
    ? `${atlasLabel(atlasId)}: ${currentNode.improvement}`
    : null;

  return (
    <div className={styles.wrap}>
      <EvolutionTreePanel nodes={visibleNodes} atlasId={atlasId} atlasName={atlasName} />

      {isReplay && (
        <>
          {thinkingText && (
            <div className={styles.thinkingBar}>
              <div className={styles.avatar}>
                <img src="/logo.png" alt="Hackie" />
                <span className={styles.avatarName}>Hackie</span>
              </div>
              <div className={styles.content}>
                <span className={styles.label}>AI 사고 과정</span>
                <p key={currentStep} className={styles.sentence}>› {thinkingText}</p>
              </div>
            </div>
          )}

          <div className={styles.stepper}>
            <button
              className={styles.stepBtn}
              onClick={() => setStep(Math.max(0, currentStep - 1))}
              disabled={currentStep <= 0}
            >
              ‹ Previous
            </button>
            <span className={styles.stepCount}>{currentStep + 1} / {maxStep + 1}</span>
            <button
              className={styles.stepBtn}
              onClick={() => setStep(Math.min(maxStep, currentStep + 1))}
              disabled={currentStep >= maxStep}
            >
              Next ›
            </button>
          </div>
        </>
      )}
    </div>
  );
}
