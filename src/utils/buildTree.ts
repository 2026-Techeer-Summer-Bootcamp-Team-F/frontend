import type { EvolutionNode } from '../api/scans';

export interface EChartsTreeNode {
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
  const label = `Gen${node.generation} · ${Math.round(node.score * 100)}% · ${node.mutation_op}`;
  const children = (childMap.get(node.attempt_id) ?? []).map(c => toEChartsNode(c, childMap));
  return {
    name: label,
    value: node.score,
    itemStyle: { color: node.verdict === 'breached' ? BREACH_COLOR : SAFE_COLOR },
    tooltip: { formatter: node.prompt_preview || '(빈 프롬프트)' },
    children,
    _meta: {
      attempt_id: node.attempt_id,
      improvement: node.improvement,
      prompt_preview: node.prompt_preview,
    },
  };
}

/** 플랫 EvolutionNode 배열 → ECharts tree series data 배열 (루트가 여러 개일 수 있음) */
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
  return roots.map(r => toEChartsNode(r, childMap));
}

/** visibleCount 개수만큼만 노드를 포함한 서브셋 반환 (재생 애니메이션용) */
export function sliceNodes(nodes: EvolutionNode[], count: number): EvolutionNode[] {
  const sorted = [...nodes].sort((a, b) =>
    a.generation !== b.generation ? a.generation - b.generation : a.attempt_id - b.attempt_id
  );
  return sorted.slice(0, count);
}
