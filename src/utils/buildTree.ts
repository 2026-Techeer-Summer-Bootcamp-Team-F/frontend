import type { EvolutionNode } from '../api/scans';

export interface EChartsTreeNode {
  id: string;
  name: string;
  value: number;
  itemStyle: { color: string };
  tooltip: { formatter: string };
  children: EChartsTreeNode[];
  _meta: { attempt_id: number; improvement: string; prompt_preview: string };
}

const BREACH_COLOR = '#e0525f';
const SAFE_COLOR = '#4caf8a';

function toEChartsNode(node: EvolutionNode, childMap: Map<number, EvolutionNode[]>): EChartsTreeNode {
  const label = `Gen${node.generation} · ${Math.min(100, Math.round(node.score * 100))}% · ${node.mutation_op || '—'}`;
  const children = (childMap.get(node.attempt_id) ?? []).map(c => toEChartsNode(c, childMap));
  return {
    id: String(node.attempt_id),
    name: label,
    value: node.score,
    itemStyle: { color: node.verdict === 'breached' ? BREACH_COLOR : SAFE_COLOR },
    tooltip: { formatter: node.prompt_preview || '(빈 프롬프트)' },
    children,
    _meta: {
      attempt_id: node.attempt_id,
      improvement: node.improvement || '',
      prompt_preview: node.prompt_preview,
    },
  };
}

/** 플랫 EvolutionNode 배열 → ECharts tree series data 배열.
 *  gen-0(씨앗) 노드가 있으면 SEED POOL 가상 루트 아래에 묶어 선택 단계를 시각화. */
export function buildEChartsTree(nodes: EvolutionNode[]): EChartsTreeNode[] {
  const childMap = new Map<number, EvolutionNode[]>();
  for (const n of nodes) {
    if (n.parent_id !== null) {
      const arr = childMap.get(n.parent_id) ?? [];
      arr.push(n);
      childMap.set(n.parent_id, arr);
    }
  }
  const roots = nodes.filter(n => n.parent_id === null);
  if (roots.length === 0) return [];
  const seedPool: EChartsTreeNode = {
    id: '__seed_pool__',
    name: 'SEED POOL',
    value: 0,
    itemStyle: { color: '#4a6a7a' },
    tooltip: { formatter: `corpus에서 ${roots.length}개 씨앗 프롬프트 선택` },
    children: roots.map(r => toEChartsNode(r, childMap)),
    _meta: { attempt_id: -1, improvement: `corpus에서 ${roots.length}개 씨앗 프롬프트를 검색해 선택했습니다.`, prompt_preview: '' },
  };
  return [seedPool];
}

/**
 * generation 순으로 정렬 후 count개 노드 반환 (재생 애니메이션용).
 * 주의: 슬라이스 경계에서 부모가 포함되지 않은 자식 노드는
 * buildEChartsTree에서 독립 루트로 처리될 수 있음.
 */
export function sliceNodes(nodes: EvolutionNode[], count: number): EvolutionNode[] {
  const sorted = [...nodes].sort((a, b) =>
    a.generation !== b.generation ? a.generation - b.generation : a.attempt_id - b.attempt_id
  );
  return sorted.slice(0, count);
}
