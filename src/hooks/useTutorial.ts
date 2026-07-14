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
  currentStep: TutorialStep;
  total: number;
  next: () => void;
  prev: () => void;
  skip: () => void;
}

export function useTutorial(key: string, steps: TutorialStep[]): UseTutorialReturn {
  const storageKey = `tutorial_done_${key}`;
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const calledForceOpen = useRef<number>(-1);

  // 마운트 시 완료 여부 확인
  useEffect(() => {
    if (!localStorage.getItem(storageKey)) {
      setActive(true);
    }
  }, [storageKey]);

  // 스텝 변경 시 forceOpen 실행 (중복 실행 방지)
  useEffect(() => {
    if (!active) return;
    const current = steps[step];
    if (current?.forceOpen && calledForceOpen.current !== step) {
      calledForceOpen.current = step;
      current.forceOpen();
    }
  }, [active, step, steps]);

  const complete = useCallback(() => {
    localStorage.setItem(storageKey, 'true');
    setActive(false);
  }, [storageKey]);

  const next = useCallback(() => {
    if (step >= steps.length - 1) {
      complete();
    } else {
      setStep(s => s + 1);
    }
  }, [step, steps.length, complete]);

  const prev = useCallback(() => {
    setStep(s => Math.max(0, s - 1));
  }, []);

  const skip = useCallback(() => {
    complete();
  }, [complete]);

  return {
    active,
    step,
    currentStep: steps[step] ?? steps[0],
    total: steps.length,
    next,
    prev,
    skip,
  };
}
