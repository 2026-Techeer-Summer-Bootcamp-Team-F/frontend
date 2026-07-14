export const SCAN_POLL_INTERVAL_MS = 3000;

// MITRE ATLAS 기법 코드 → 한국어 이름
export const ATLAS_LABELS: Record<string, string> = {
  'AML.T0054':     'LLM Jailbreak',
  'AML.T0054.000': 'LLM Jailbreak',
  'AML.T0051':     'LLM 프롬프트 인젝션',
  'AML.T0051.000': 'LLM 프롬프트 인젝션: 직접',
  'AML.T0051.001': 'LLM 프롬프트 인젝션: 간접',
  'AML.T0056':     'LLM 시스템 프롬프트 유출',
  'AML.T0057':     'LLM 데이터 유출',
  'AML.T0053':     'AI 에이전트 도구 악용',
  'AML.T0048':     '데이터 추출',
  'AML.T0052':     '역할극 공격',
};

/** `AML.T0051.001` → `[AML.T0051.001: LLM 프롬프트 인젝션: 간접]` */
export function atlasLabel(code: string | null | undefined): string {
  if (!code) return '[?]';
  const name = ATLAS_LABELS[code];
  return name ? `[${code}: ${name}]` : `[${code}]`;
}
