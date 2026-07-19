import { useEffect, useLayoutEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import * as echarts from 'echarts';

// echarts raw 래퍼 — option을 받아 init/setOption/dispose + resize 처리.
// notMerge=true(기본): 이전 option 전체 교체. false: diff 후 애니메이션 업데이트.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function EChart({
  option,
  className,
  style,
  notMerge = true,
  onEvents,
}: {
  option: any;
  className?: string;
  style?: CSSProperties;
  notMerge?: boolean;
  onEvents?: Record<string, (params: any) => void>;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);
  const onEventsRef = useRef(onEvents);
  useLayoutEffect(() => { onEventsRef.current = onEvents; });

  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current);
    chartRef.current = chart;
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      chart.dispose();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    chartRef.current?.setOption(option, notMerge);
  }, [option, notMerge]);

  // 이벤트 핸들러: 마운트 시 한 번만 등록. 최신 핸들러는 ref로 참조.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const names = Object.keys(onEventsRef.current ?? {});
    const wrappers = names.map(name => {
      const fn = (params: unknown) => onEventsRef.current?.[name]?.(params);
      chart.on(name, fn);
      return { name, fn };
    });
    return () => { wrappers.forEach(({ name, fn }) => chart.off(name, fn)); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={ref} className={className} style={style} />;
}
