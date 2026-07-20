export const SCAN_POLL_INTERVAL_MS = 3000;

export const VERDICT_COLOR: Record<string, string> = {
  breached:  '#e0525f',
  safe:      '#4caf8a',
  error:     '#888',
  seed_pool: '#4a6a7a',
};

export const VERDICT_LABEL: Record<string, string> = {
  breached:  '침투 성공',
  safe:      '방어됨',
  error:     '오류',
  seed_pool: 'SEED POOL',
};

export const MUTATION_LINE_COLOR: Record<string, string> = {
  seed:      '#4a6a7a',
  expand:    '#5ba87a',
  crossover: '#d48a3a',
  rephrase:  '#7a6aaa',
  translate: '#4a7aaa',
  shorten:   '#aaaa4a',
  inject:    '#aa4a4a',
  jailbreak: '#cc5a3a',
};

// MITRE ATLAS 기법 코드 → 한국어 이름
export const ATLAS_LABELS: Record<string, string> = {
  'AML.T0054':     'LLM Jailbreak',
  'AML.T0054.000': 'LLM Jailbreak: Direct',
  'AML.T0051':     'LLM Prompt Injection',
  'AML.T0051.000': 'LLM Prompt Injection: Direct',
  'AML.T0051.001': 'LLM Prompt Injection: Indirect',
  'AML.T0056':     'Extract LLM System Prompt',
  'AML.T0057':     'LLM Data Leakage',
  'AML.T0053':     'AI Agent Tool Invocation',
  'AML.T0048':     'LLM Data Extraction',
  'AML.T0052':     'Role-Playing Attack',
};

/** `AML.T0051.001` → `[AML.T0051.001: LLM 프롬프트 인젝션: 간접]` */
export function atlasLabel(code: string | null | undefined): string {
  if (!code) return '[?]';
  const name = ATLAS_LABELS[code];
  return name ? `[${code} - ${name}]` : `[${code}]`;
}
