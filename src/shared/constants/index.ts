export const SCAN_POLL_INTERVAL_MS = 3000;

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
