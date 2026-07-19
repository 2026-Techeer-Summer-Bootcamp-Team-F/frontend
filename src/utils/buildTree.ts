import type { EvolutionNode } from '../api/scans';

export interface EChartsTreeNode {
  id: string;
  name: string;
  value: number;
  symbolSize: number;
  itemStyle: {
    color: string;
    borderColor?: string;
    borderWidth?: number;
    shadowBlur?: number;
    shadowColor?: string;
  };
  lineStyle?: { color: string; width?: number };
  tooltip: { formatter: string };
  children: EChartsTreeNode[];
  _meta: {
    attempt_id: number;
    improvement: string;
    prompt_preview: string;
    generation: number;
    score: number;
    verdict: 'breached' | 'safe' | 'error' | 'seed_pool';
    mutation_op: string;
  };
}

const BREACH_COLOR = '#e0525f';
const SAFE_COLOR   = '#4caf8a';
const ERROR_COLOR  = '#888';

// mutation_op → 엣지 색상
const MUTATION_LINE_COLOR: Record<string, string> = {
  seed:      '#4a6a7a',
  expand:    '#5ba87a',
  crossover: '#d48a3a',
  rephrase:  '#7a6aaa',
  translate: '#4a7aaa',
  shorten:   '#aaaa4a',
  inject:    '#aa4a4a',
  jailbreak: '#cc5a3a',
};

function getMutationColor(op: string): string {
  return MUTATION_LINE_COLOR[op.toLowerCase()] ?? '#556';
}

// score(0~1) → symbolSize(6~20)
function scoreToSize(score: number): number {
  return Math.round(6 + score * 14);
}

function toEChartsNode(
  node: EvolutionNode,
  childMap: Map<number, EvolutionNode[]>,
  bestByGen: Map<number, number>,
): EChartsTreeNode {
  const isBest = node.score > 0 && node.score === bestByGen.get(node.generation);
  const nodeColor = node.verdict === 'breached' ? BREACH_COLOR
    : node.verdict === 'error' ? ERROR_COLOR
    : SAFE_COLOR;

  const label = `Gen${node.generation} · ${Math.min(100, Math.round(node.score * 100))}% · ${node.mutation_op || '—'}`;
  const tooltipLines = [label, node.prompt_preview || '(빈 프롬프트)'].join('<br/>');

  const children = (childMap.get(node.attempt_id) ?? [])
    .map(c => toEChartsNode(c, childMap, bestByGen));

  return {
    id: String(node.attempt_id),
    name: '',
    value: node.score,
    symbolSize: scoreToSize(node.score),
    itemStyle: {
      color: nodeColor,
      ...(isBest ? {
        borderColor: '#fff',
        borderWidth: 2,
        shadowBlur: 10,
        shadowColor: 'rgba(255,255,255,0.45)',
      } : {}),
    },
    lineStyle: { color: getMutationColor(node.mutation_op), width: 1.5 },
    tooltip: { formatter: tooltipLines },
    children,
    _meta: {
      attempt_id: node.attempt_id,
      improvement: node.improvement || '',
      prompt_preview: node.prompt_preview,
      generation: node.generation,
      score: node.score,
      verdict: node.verdict,
      mutation_op: node.mutation_op || 'seed',
    },
  };
}

/** 플랫 EvolutionNode 배열 → ECharts tree series data 배열. */
export function buildEChartsTree(nodes: EvolutionNode[]): EChartsTreeNode[] {
  if (nodes.length === 0) return [];

  // 세대별 최고 점수 계산 (1번: 강조 테두리 기준)
  const bestByGen = new Map<number, number>();
  for (const n of nodes) {
    const cur = bestByGen.get(n.generation) ?? 0;
    if (n.score > cur) bestByGen.set(n.generation, n.score);
  }

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
    symbolSize: 10,
    itemStyle: { color: '#4a6a7a' },
    tooltip: { formatter: `corpus에서 ${roots.length}개 씨앗 프롬프트 선택` },
    children: roots.map(r => toEChartsNode(r, childMap, bestByGen)),
    _meta: {
      attempt_id: -1,
      improvement: `corpus에서 ${roots.length}개 씨앗 프롬프트를 검색해 선택했습니다.`,
      prompt_preview: '',
      generation: -1,
      score: 0,
      verdict: 'seed_pool',
      mutation_op: '',
    },
  };
  return [seedPool];
}

/**
 * generation 순으로 정렬 후 count개 노드 반환 (재생 애니메이션용).
 */
export function sliceNodes(nodes: EvolutionNode[], count: number): EvolutionNode[] {
  const sorted = [...nodes].sort((a, b) =>
    a.generation !== b.generation ? a.generation - b.generation : a.attempt_id - b.attempt_id
  );
  return sorted.slice(0, count);
}
