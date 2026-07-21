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

// MITRE ATLAS 기법 코드 → 영문 이름 (히트맵·리포트 등 UI 표시용)
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

// MITRE ATLAS 기법 코드 → 한국어 이름 (터미널 로그 메시지 전용)
export const ATLAS_KO_LABELS: Record<string, string> = {
  'AML.T0054':     '탈옥',
  'AML.T0054.000': '탈옥: 직접',
  'AML.T0051':     '프롬프트 인젝션',
  'AML.T0051.000': '프롬프트 인젝션: 직접',
  'AML.T0051.001': '프롬프트 인젝션: 간접',
  'AML.T0056':     '시스템 프롬프트 추출',
  'AML.T0057':     '데이터 유출',
  'AML.T0053':     '에이전트 도구 악용',
  'AML.T0048':     '데이터 추출',
  'AML.T0052':     '역할극 공격',
};

/** `AML.T0051.001` → `[AML.T0051.001: LLM 프롬프트 인젝션: 간접]` */
export function atlasLabel(code: string | null | undefined): string {
  if (!code) return '[?]';
  const name = ATLAS_LABELS[code];
  return name ? `[${code} - ${name}]` : `[${code}]`;
}

/** 터미널 로그용 한국어 기법 이름. 예: 'AML.T0054' → '탈옥' */
export function atlasKoName(code: string | null | undefined): string {
  if (!code) return '알 수 없는 공격';
  return ATLAS_KO_LABELS[code] ?? ATLAS_LABELS[code] ?? code;
}
