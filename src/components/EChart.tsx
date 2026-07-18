import { useEffect, useRef } from 'react';
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
}: {
  option: any;
  className?: string;
  style?: CSSProperties;
  notMerge?: boolean;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

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

  return <div ref={ref} className={className} style={style} />;
}
