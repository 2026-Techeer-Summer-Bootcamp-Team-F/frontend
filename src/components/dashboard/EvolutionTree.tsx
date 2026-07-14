import { useMemo, useState } from 'react';
import { EChart } from '../EChart';
import type { EvolutionObjective, EvolutionAttempt } from '../../api/scans';
import { atlasLabel } from '../../shared/constants';

interface Props {
  objectives: EvolutionObjective[];
}

// fitness → 노드 색상
function fitnessColor(fitness: number, breached: boolean): string {
  if (breached) return '#e0525f';
  if (fitness >= 0.8) return '#e0a452';
  if (fitness >= 0.5) return '#e0d252';
  if (fitness >= 0.3) return '#5ecb8a';
  return '#3a5a4a';
}

const OP_LABEL: Record<string, string> = {
  seed:             'SEED',
  expand:           'EXPAND',
  shorten:          'TRIM',
  rephrase:         'REPHRASE',
  encode:           'ENCODE',
  crossover:        'CROSSOVER',
  generate_similar: 'SIMILAR',
};

const OP_DESC: Record<string, string> = {
  seed:             '초기 공격 케이스',
  expand:           '문맥 확장 변이',
  shorten:          '핵심만 압축',
  rephrase:         '표현 재구성',
  encode:           'Base64 인코딩',
  crossover:        '우수 케이스 교차',
  generate_similar: '유사 패턴 생성',
};

function buildTree(attempts: EvolutionAttempt[]): object | null {
  if (!attempts.length) return null;

  const map = new Map<number, EvolutionAttempt & { children: object[] }>();
  attempts.forEach(a => map.set(a.attempt_id, { ...a, children: [] }));

  const roots: object[] = [];
  map.forEach(node => {
    const nodeData = {
      name: `${OP_LABEL[node.mutation_op] ?? node.mutation_op}  ${node.fitness.toFixed(2)}`,
      value: node.fitness,
      prompt: node.prompt,
      breached: node.breached,
      generation: node.generation,
      mutation_op: node.mutation_op,
      itemStyle: {
        color: fitnessColor(node.fitness, node.breached),
        borderColor: node.breached ? '#ff3a4a' : 'rgba(94,203,138,0.3)',
        borderWidth: node.breached ? 2 : 1,
      },
      label: {
        color: node.breached ? '#ffaaaa' : '#c6e2d5',
        fontSize: 10,
      },
      children: node.children,
    };

    if (node.parent_id === null) {
      roots.push(nodeData);
    } else {
      const parent = map.get(node.parent_id);
      if (parent) parent.children.push(nodeData);
    }
  });

  // 루트가 여럿이면 가상 루트로 묶음
  if (roots.length === 1) return roots[0];
  return {
    name: 'INITIAL POOL',
    itemStyle: { color: '#0e1512', borderColor: 'rgba(94,203,138,0.4)', borderWidth: 1.5 },
    label: { color: 'rgba(94,203,138,0.7)', fontSize: 10, fontWeight: 'bold' },
    symbol: 'diamond',
    symbolSize: 10,
    children: roots,
  };
}

export function EvolutionTree({ objectives }: Props) {
  const [selected, setSelected] = useState(0);

  const obj = objectives[selected];
  const tree = useMemo(() => obj ? buildTree(obj.attempts) : null, [obj]);

  const option = useMemo(() => {
    if (!tree) return null;
    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: '#0d1512',
        borderColor: 'rgba(94,203,138,0.2)',
        textStyle: { color: '#e8f0ea', fontSize: 11 },
        formatter: (params: any) => {
          const d = params.data;
          if (!d?.generation === undefined) return params.name;
          const badge = d.breached ? '<span style="color:#e0525f;font-weight:700">⚡ BREACH</span><br/>' : '';
          const op = OP_LABEL[d.mutation_op] ?? d.mutation_op;
          const opDesc = OP_DESC[d.mutation_op] ?? '';
          return `${badge}<b>GEN.${d.generation}</b> · <span style="color:#5ecb8a">${op}</span>${opDesc ? ` <span style="color:rgba(240,244,242,0.4);font-size:10px">${opDesc}</span>` : ''}<br/>fitness <b>${d.value?.toFixed(3)}</b>`;
        },
      },
      series: [{
        type: 'tree',
        data: [tree],
        top: '5%', bottom: '5%', left: '12%', right: '20%',
        symbol: 'circle',
        symbolSize: (val: number) => Math.max(14, Math.min(32, val * 40)),
        orient: 'LR',
        expandAndCollapse: false,
        edgeShape: 'curve',
        edgeForkPosition: '63%',
        lineStyle: { color: 'rgba(94,203,138,0.18)', width: 1.5, curveness: 0.5 },
        label: {
          position: 'right',
          verticalAlign: 'middle',
          fontSize: 10,
          color: '#8fb8a8',
        },
        leaves: {
          label: { position: 'right', verticalAlign: 'middle' },
        },
        animationDuration: 550,
        animationEasing: 'cubicOut',
      }],
    };
  }, [tree]);

  if (!objectives.length) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* 기법 탭 */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {objectives.map((o, i) => (
          <button
            key={o.objective_id}
            onClick={() => setSelected(i)}
            style={{
              background: i === selected ? 'rgba(94,203,138,0.15)' : 'transparent',
              border: `1px solid ${i === selected ? '#5ecb8a' : 'rgba(94,203,138,0.2)'}`,
              color: i === selected ? '#5ecb8a' : 'rgba(240,244,242,0.55)',
              borderRadius: 5,
              padding: '3px 10px',
              fontSize: 11,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {atlasLabel(o.atlas_technique_id).replace(/^\[/, '').replace(/\]$/, '')}
            {o.status === 'breached' && ' ⚡'}
          </button>
        ))}
      </div>

      {/* 범례 */}
      <div style={{ display: 'flex', gap: 14, fontSize: 10, color: 'rgba(240,244,242,0.4)' }}>
        {[
          { color: '#3a5a4a', label: '낮은 fitness' },
          { color: '#5ecb8a', label: '참여 감지' },
          { color: '#e0d252', label: '위험 근접' },
          { color: '#e0a452', label: '고위험' },
          { color: '#e0525f', label: '침투 성공' },
        ].map(({ color, label }) => (
          <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <i style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }} />
            {label}
          </span>
        ))}
      </div>

      {/* 트리 차트 */}
      {option
        ? <EChart option={option} style={{ height: 320 }} />
        : <p style={{ color: 'rgba(240,244,242,0.3)', fontSize: 12 }}>시도 데이터 없음</p>
      }
    </div>
  );
}
