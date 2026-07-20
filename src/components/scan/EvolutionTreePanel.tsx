import { useMemo, useRef, useState } from 'react';
import { EChart } from '../EChart';
import { buildEChartsTree, type EChartsTreeNode } from '../../utils/buildTree';
import type { EvolutionNode } from '../../api/scans';
import { describePrompt } from '../../api/scans';
import { VERDICT_COLOR, VERDICT_LABEL } from '../../shared/constants';
import { TreeLegend } from './TreeLegend';
import styles from './EvolutionTreePanel.module.css';

interface Props {
  nodes: EvolutionNode[];
  atlasId: string;
  atlasName: string;
}

interface TooltipState {
  x: number;
  y: number;
  node: EChartsTreeNode;
}

export function EvolutionTreePanel({ nodes, atlasId, atlasName }: Props) {
  const treeData = useMemo(() => buildEChartsTree(nodes), [nodes]);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const descCacheRef = useRef<Map<number, string>>(new Map());
  const descLoadingRef = useRef<Set<number>>(new Set());
  const [, setDescVersion] = useState(0);

  const onEvents = useMemo(() => ({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mouseover: (params: any) => {
      const meta = params.data?._meta;
      if (!meta) return;
      setTooltip({
        x: params.event.event.clientX,
        y: params.event.event.clientY,
        node: params.data as EChartsTreeNode,
      });
      if (
        meta.verdict !== 'seed_pool' &&
        meta.prompt_preview &&
        !descCacheRef.current.has(meta.attempt_id) &&
        !descLoadingRef.current.has(meta.attempt_id)
      ) {
        descLoadingRef.current.add(meta.attempt_id);
        describePrompt(meta.prompt_preview).then(desc => {
          descLoadingRef.current.delete(meta.attempt_id);
          descCacheRef.current.set(meta.attempt_id, desc);
          setDescVersion(v => v + 1);
        });
      }
    },
    mouseout: () => setTooltip(null),
  }), []);

  const option = useMemo(() => ({
    tooltip: { show: false },
    series: [
      {
        type: 'tree',
        data: treeData,
        orient: 'TB',
        top: '8%',
        bottom: '8%',
        left: '5%',
        right: '5%',
        symbol: 'circle',
        roam: true,
        label: { show: false },
        leaves: { label: { show: false } },
        lineStyle: { width: 1.5, curveness: 0 },
        expandAndCollapse: false,
        animationDuration: 400,
        animationDurationUpdate: 300,
      },
    ],
  }), [treeData]);

  const meta = tooltip?.node._meta;

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.dots}>
          <span className={`${styles.dot} ${styles.g}`} />
          <span className={`${styles.dot} ${styles.y}`} />
          <span className={`${styles.dot} ${styles.gr}`} />
        </div>
        <span className={styles.title}>EVOLUTION TREE</span>
        <span className={styles.atlasTag}>{atlasId}</span>
        {atlasName && <span className={styles.atlasTag}>{atlasName}</span>}
      </div>

      {nodes.length === 0 ? (
        <p className={styles.empty}>
          {atlasId ? '공격 시도를 기다리는 중...' : '세션을 선택하면\n진화 트리가 표시됩니다'}
        </p>
      ) : (
        <>
          {treeData.length > 0
            ? <EChart option={option} onEvents={onEvents} className={styles.chart} notMerge={false} />
            : <div className={styles.chart} />
          }
          <TreeLegend />
        </>
      )}

      {tooltip && meta && (
        <div
          className={styles.tooltip}
          style={{
            left: tooltip.x + 14,
            top: tooltip.y + 14,
            ...(meta.verdict === 'seed_pool' && { maxWidth: 'max-content' }),
          }}
        >
          <div className={styles.tooltipHeader}>
            <span
              className={styles.tooltipVerdict}
              style={{ background: VERDICT_COLOR[meta.verdict] ?? '#888' }}
            >
              {VERDICT_LABEL[meta.verdict] ?? meta.verdict}
            </span>
            {meta.verdict !== 'seed_pool' && (
              <span className={styles.tooltipMeta}>
                Gen {meta.generation} · {Math.min(100, Math.round(meta.score * 100))}% · {meta.mutation_op}
              </span>
            )}
          </div>
          {meta.verdict === 'seed_pool' && (
            <p className={styles.tooltipPrompt} style={{ whiteSpace: 'nowrap', overflow: 'visible', display: 'block' }}>
              {meta.improvement}
            </p>
          )}
          {meta.verdict !== 'seed_pool' && (() => {
            const isLoading = descLoadingRef.current.has(meta.attempt_id);
            const desc = descCacheRef.current.get(meta.attempt_id);
            if (isLoading) return <p className={styles.tooltipPrompt} style={{ opacity: 0.5 }}>분석 중...</p>;
            if (desc) return <p className={styles.tooltipPrompt}>{desc}</p>;
            return null;
          })()}
        </div>
      )}

    </div>
  );
}
