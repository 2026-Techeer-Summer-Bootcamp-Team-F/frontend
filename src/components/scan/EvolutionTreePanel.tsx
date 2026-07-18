import { useMemo } from 'react';
import { EChart } from '../EChart';
import { buildEChartsTree } from '../../utils/buildTree';
import type { EvolutionNode } from '../../api/scans';
import styles from './EvolutionTreePanel.module.css';

interface Props {
  nodes: EvolutionNode[];
  atlasId: string;
  atlasName: string;
  latestImprovement: string;
}

export function EvolutionTreePanel({ nodes, atlasId, atlasName, latestImprovement }: Props) {
  const treeData = useMemo(() => buildEChartsTree(nodes), [nodes]);

  const option = useMemo(() => ({
    tooltip: {
      trigger: 'item',
      formatter: (params: { data: { tooltip?: { formatter?: string } } }) =>
        params.data?.tooltip?.formatter ?? '',
    },
    series: [
      {
        type: 'tree',
        data: treeData,
        orient: 'LR',
        symbol: 'circle',
        symbolSize: 10,
        label: {
          position: 'left',
          verticalAlign: 'middle',
          fontSize: 10,
          color: '#ccc',
          distance: 8,
        },
        leaves: {
          label: { position: 'right', verticalAlign: 'middle' },
        },
        lineStyle: { color: '#445', width: 1.5 },
        expandAndCollapse: false,
        animationDuration: 400,
        animationDurationUpdate: 300,
      },
    ],
  }), [treeData]);

  const thinkingText = latestImprovement || 'corpus에서 초기 씨앗 프롬프트를 검색 중...';

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>EVOLUTION TREE</span>
        <span className={styles.atlasTag}>{atlasId}</span>
        {atlasName && <span className={styles.atlasTag}>{atlasName}</span>}
      </div>

      {nodes.length === 0 ? (
        <p className={styles.empty}>공격 시도를 기다리는 중...</p>
      ) : (
        <EChart option={option} className={styles.chart} notMerge={false} />
      )}

      <div className={styles.thinking}>
        <p className={styles.thinkingLabel}>AI 사고 과정</p>
        <p key={thinkingText} className={styles.thinkingText}>{thinkingText}</p>
      </div>
    </div>
  );
}
