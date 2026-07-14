import { useEffect, useState } from 'react';
import { subscribeScanProgress } from '../../utils/sse';
import { getScan } from '../../api/scans';
import type { ScanProgressEvent } from '../../types';

interface Props {
  scanId: number;
  onComplete: (scanId: number) => void;
}

export function ProgressLive({ scanId, onComplete }: Props) {
  const [events, setEvents] = useState<ScanProgressEvent[]>([]);
  const [maxFitness, setMaxFitness] = useState(0);
  const [currentPrompt, setCurrentPrompt] = useState('');

  useEffect(() => {
    const unsubscribe = subscribeScanProgress(
      scanId,
      (event) => {
        setEvents((prev) => [...prev, event]);
        setMaxFitness((prev) => Math.max(prev, event.fitness));
        setCurrentPrompt(event.prompt_preview);
      },
    );

    const pollStatus = setInterval(async () => {
      const scan = await getScan(scanId);
      if (scan.status === 'done' || scan.status === 'failed') {
        clearInterval(pollStatus);
        unsubscribe();
        onComplete(scanId);
      }
    }, 3000);

    return () => {
      unsubscribe();
      clearInterval(pollStatus);
    };
  }, [scanId, onComplete]);

  return (
    <div>
      <p>최고 fitness: {maxFitness.toFixed(3)}</p>
      <p>현재 프롬프트: {currentPrompt}</p>
      <p>총 시도: {events.length}회</p>
      <ul>
        {events.slice(-10).map((e, i) => (
          <li key={i}>
            세대 {e.generation} | {e.mutation_op ?? 'seed'} | fitness {e.fitness.toFixed(3)}{' '}
            {e.success && '✅'}
          </li>
        ))}
      </ul>
    </div>
  );
}
