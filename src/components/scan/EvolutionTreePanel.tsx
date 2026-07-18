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
        orient: 'TB',
        top: '8%',
        bottom: '8%',
        left: '5%',
        right: '5%',
        symbol: 'circle',
        symbolSize: 8,
        roam: true,
        label: {
          position: 'top',
          verticalAlign: 'bottom',
          fontSize: 10,
          color: '#ccc',
          distance: 5,
        },
        leaves: {
          label: { position: 'bottom', verticalAlign: 'top', distance: 5 },
        },
        lineStyle: { color: '#445', width: 1.5 },
        expandAndCollapse: false,
        animationDuration: 400,
        animationDurationUpdate: 300,
      },
    ],
  }), [treeData]);

  const rawThinking = latestImprovement || 'corpus에서 초기 씨앗 프롬프트를 검색 중...';
  const thinkingLines = rawThinking
    .split(/(?<=[.。!?])\s+|[\n]/)
    .map((s: string) => s.trim())
    .filter(Boolean);

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
        <EChart option={option} className={styles.chart} />
      )}

      <div className={styles.thinking}>
        <p className={styles.thinkingLabel}>AI 사고 과정</p>
        <ul key={rawThinking} className={styles.thinkingList}>
          {thinkingLines.map((line: string, i: number) => (
            <li key={i} className={styles.thinkingItem}>{line}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
