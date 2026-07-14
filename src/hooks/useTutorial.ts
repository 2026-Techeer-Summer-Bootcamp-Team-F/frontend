import { useCallback, useEffect, useRef, useState } from 'react';

export interface TutorialStep {
  selector: string;
  title: string;
  desc: string;
  forceOpen?: () => void;
}

interface UseTutorialReturn {
  active: boolean;
  step: number;
  currentStep: TutorialStep | undefined;
  total: number;
  next: () => void;
  prev: () => void;
  skip: () => void;
}

function safeGetStorage(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

function safeSetStorage(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch { /* ignore */ }
}

export function useTutorial(key: string, steps: TutorialStep[]): UseTutorialReturn {
  const storageKey = `tutorial_done_${key}`;
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const calledForceOpenStep = useRef<number>(-1);
  const stepsRef = useRef(steps);
  stepsRef.current = steps;

  // 마운트 시 완료 여부 확인 (steps가 있을 때만)
  useEffect(() => {
    if (steps.length > 0 && !safeGetStorage(storageKey)) {
      setActive(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  // 스텝 변경 시 forceOpen 실행 (stepsRef로 안정적 참조, 중복 방지)
  useEffect(() => {
    if (!active) return;
    const current = stepsRef.current[step];
    if (current?.forceOpen && calledForceOpenStep.current !== step) {
      calledForceOpenStep.current = step;
      current.forceOpen();
    }
  }, [active, step]);

  const complete = useCallback(() => {
    safeSetStorage(storageKey, 'true');
    setActive(false);
  }, [storageKey]);

  const next = useCallback(() => {
    setStep(s => {
      if (s >= stepsRef.current.length - 1) {
        safeSetStorage(storageKey, 'true');
        setActive(false);
        return s;
      }
      return s + 1;
    });
  }, [storageKey]);

  const prev = useCallback(() => {
    setStep(s => Math.max(0, s - 1));
  }, []);

  const skip = useCallback(() => {
    complete();
  }, [complete]);

  return {
    active,
    step,
    currentStep: steps[step],
    total: steps.length,
    next,
    prev,
    skip,
  };
}
