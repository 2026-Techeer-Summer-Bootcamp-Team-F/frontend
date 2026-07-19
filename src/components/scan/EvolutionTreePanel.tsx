import { useMemo, useState } from 'react';
import { EChart } from '../EChart';
import { buildEChartsTree, type EChartsTreeNode } from '../../utils/buildTree';
import type { EvolutionNode } from '../../api/scans';
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

const VERDICT_LABEL: Record<string, string> = {
  breached: '침투 성공',
  safe: '방어됨',
  error: '오류',
  seed_pool: 'SEED POOL',
};

const VERDICT_COLOR: Record<string, string> = {
  breached: '#e0525f',
  safe: '#4caf8a',
  error: '#888',
  seed_pool: '#4a6a7a',
};

export function EvolutionTreePanel({ nodes, atlasId, atlasName }: Props) {
  const treeData = useMemo(() => buildEChartsTree(nodes), [nodes]);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

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
        symbolSize: 8,
        roam: true,
        label: { show: false },
        leaves: { label: { show: false } },
        lineStyle: { color: '#445', width: 1.5 },
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
        <span className={styles.title}>EVOLUTION TREE</span>
        <span className={styles.atlasTag}>{atlasId}</span>
        {atlasName && <span className={styles.atlasTag}>{atlasName}</span>}
      </div>

      {nodes.length === 0 ? (
        <p className={styles.empty}>
          {atlasId ? '공격 시도를 기다리는 중...' : '세션을 선택하면\n진화 트리가 표시됩니다'}
        </p>
      ) : (
        <EChart option={option} onEvents={onEvents} className={styles.chart} notMerge={false} />
      )}

      {tooltip && meta && (
        <div
          className={styles.tooltip}
          style={{ left: tooltip.x + 14, top: tooltip.y + 14 }}
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
          {meta.prompt_preview && (
            <p className={styles.tooltipPrompt}>{meta.prompt_preview}</p>
          )}
          {meta.verdict === 'seed_pool' && (
            <p className={styles.tooltipPrompt}>{meta.improvement}</p>
          )}
        </div>
      )}

    </div>
  );
}
