import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { TutorialStep } from '../../hooks/useTutorial';
import styles from './TutorialOverlay.module.css';

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PAD = 8;

interface Props {
  step: TutorialStep;
  stepIndex: number;
  total: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}

export function TutorialOverlay({ step, stepIndex, total, onNext, onPrev, onSkip }: Props) {
  const [rect, setRect] = useState<Rect | null>(null);

  const calcRect = useCallback(() => {
    const el = document.querySelector(`[data-tutorial="${step.selector}"]`);
    if (!el) { setRect(null); return; }
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    requestAnimationFrame(() => {
      const r = el.getBoundingClientRect();
      setRect({
        top: r.top - PAD,
        left: r.left - PAD,
        width: r.width + PAD * 2,
        height: r.height + PAD * 2,
      });
    });
  }, [step.selector]);

  useEffect(() => {
    calcRect();
  }, [calcRect]);

  useEffect(() => {
    window.addEventListener('resize', calcRect);
    window.addEventListener('scroll', calcRect, true);
    return () => {
      window.removeEventListener('resize', calcRect);
      window.removeEventListener('scroll', calcRect, true);
    };
  }, [calcRect]);

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const top = rect?.top ?? 0;
  const left = rect?.left ?? 0;
  const w = rect?.width ?? 0;
  const h = rect?.height ?? 0;

  const isFirst = stepIndex === 0;
  const isLast = stepIndex === total - 1;

  return createPortal(
    <>
      {rect && (
        <>
          <div className={styles.panel} style={{ top: 0, left: 0, width: vw, height: top }} />
          <div className={styles.panel} style={{ top: top + h, left: 0, width: vw, height: vh - (top + h) }} />
          <div className={styles.panel} style={{ top, left: 0, width: left, height: h }} />
          <div className={styles.panel} style={{ top, left: left + w, width: vw - (left + w), height: h }} />
        </>
      )}
      {!rect && (
        <div className={styles.panel} style={{ top: 0, left: 0, width: vw, height: vh }} />
      )}
      {rect && (
        <div className={styles.highlight} style={{ top, left, width: w, height: h }} />
      )}
      <div className={styles.mascot}>
        <div className={styles.bubble}>
          <div className={styles.bubbleTop}>
            <span className={styles.indicator}>{stepIndex + 1} / {total}</span>
            <button className={styles.skipBtn} onClick={onSkip}>건너뛰기</button>
          </div>
          <p className={styles.bubbleTitle}>{step.title}</p>
          <p className={styles.bubbleDesc}>{step.desc}</p>
          <div className={styles.bubbleActions}>
            {!isFirst && (
              <button className={styles.prevBtn} onClick={onPrev}>이전</button>
            )}
            <button className={styles.nextBtn} onClick={onNext}>
              {isLast ? '완료' : '다음'}
            </button>
          </div>
        </div>
        <img src="/logo.png" alt="Hackie" className={styles.mascotImg} />
      </div>

    </>,
    document.body,
  );
}
