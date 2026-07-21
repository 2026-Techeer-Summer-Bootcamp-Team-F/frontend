// 터미널 로그(Live Analysis Log) 용어 순화 전용 매핑. — #51
//
// 채팅·트리·히트맵·리포트가 공유하는 atlasLabel/atlasKoName(shared/constants)과 분리한다.
// 여기 함수는 "터미널 로그 표현 계층"에서만 쓰며, 알아보기 힘든 원본 토큰
// (mutation_op 이름·crescendo·AML 코드·safe/breach·fitness)을 일상어로 바꾼다.
//
// 핵심 원칙(디자인 근거: docs/design/terminal-log-readable.mockup.html):
//   - 매핑에 없는 op가 와도 raw 토큰을 절대 노출하지 않고 안전한 기본 표기로 폴백한다.
//   - AI 공격자(attacker.py)는 임의 technique 문자열을 낼 수 있으므로 폴백은 필수다.

// ── op(mutation_op) → 공격 방식 한글 문구 ──
// 출처: engine/playbook.py 기법 사다리 32종 + engine/mutators.py 결정론 변이 6종.
const OP_LABELS: Record<string, string> = {
  // 변이 연산자(mutators.py OPS) — AI 공격자 OFF 또는 deterministic 폴백 경로
  generate_similar: '유사 변형',
  crossover: '교배 변형',
  expand: '프레이밍 강화 변형',
  shorten: '압축 변형',
  rephrase: '재표현 변형',
  encode: '인코딩 변형',

  // 플레이북(playbook.py) — Family1 탈옥
  direct_harmful_request: '직접 유해 요청 변형',
  roleplay_persona_dan: '역할극 페르소나 변형',
  hypothetical_fiction_framing: '가상 시나리오 포장 변형',
  obfuscation_encoding: '인코딩 난독화 변형',
  iterative_refine_pair: '반복 개선 변형',
  crescendo_multiturn: '점진 대화 공격',
  tree_of_attacks_search: '공격 경로 탐색 변형',

  // Family2 직접 프롬프트 인젝션
  ignore_previous_instructions: '이전 지시 무시 변형',
  delimiter_system_spoof: '시스템 태그 위조 변형',
  context_switch_persona: '역할 전환 변형',
  payload_obfuscation_injection: '난독화 주입 변형',
  composite_injection: '복합 주입 변형',

  // Family3 간접 프롬프트 인젝션
  rag_document_injection: '문서 삽입 변형',
  tool_output_injection: '도구 응답 삽입 변형',
  web_content_injection: '웹 콘텐츠 삽입 변형',
  triggered_injection: '잠복 트리거 변형',
  indirect_exfil_chain: '간접 유출 연쇄 변형',

  // Family4 시스템 프롬프트 유출
  direct_prompt_ask: '직접 요청 변형',
  instruction_keyword_probe: '지시문 탐침 변형',
  special_char_probe: '특수문자 탐침 변형',
  translate_summarize_leak: '번역/요약 우회 변형',
  injection_assisted_dump: '주입 결합 덤프 변형',

  // Family5 데이터 유출
  direct_pii_request: '개인정보 직접 요청 변형',
  cross_context_history_leak: '대화 이력 유출 변형',
  training_data_extraction: '학습데이터 추출 변형',
  rag_confidential_retrieval: '기밀 문서 검색 변형',
  injection_driven_exfiltration: '주입 기반 유출 변형',

  // Family6 에이전트 도구 악용
  unauthorized_tool_call: '무단 도구 호출 변형',
  tool_param_tampering: '도구 파라미터 변조 변형',
  privilege_escalation_chain: '권한 상승 연쇄 변형',
  tool_poisoning: '도구 오염 변형',
  tool_exfiltration: '도구 반출 변형',
};

// crescendo:t{N}:{phase} 의 phase → 한글 단계 이름 (attacker.py next_turn phase 값)
const CRESCENDO_PHASE: Record<string, string> = {
  rapport: '라포 형성',
  escalate: '압박 강화',
  backtrack: '우회',
  converge: '마무리',
};

/**
 * mutation_op → 사람이 읽는 공격 방식 문구. 매핑 실패 시 raw 노출 없이 '변형 공격'으로 폴백.
 * 예: 'seed'→'기본 공격', 'crescendo:t2:escalate'→'점진 대화 2단계(압박 강화)',
 *     'deterministic:expand'→'프레이밍 강화 변형', 미매핑 임의 문자열→'변형 공격'.
 */
export function opLabel(op: string | null | undefined): string {
  if (!op || op === 'seed') return '기본 공격';
  if (op === 'ai') return 'AI 설계 변형';

  // 멀티턴: crescendo:t{N}:{phase}
  const cres = /^crescendo:t(\d+):(\w+)$/.exec(op);
  if (cres) {
    const phase = CRESCENDO_PHASE[cres[2]] ?? '진행';
    return `점진 대화 ${cres[1]}단계(${phase})`;
  }

  // AI 폴백 경로: 'deterministic:expand' → 'expand'
  const key = op.startsWith('deterministic:') ? op.slice('deterministic:'.length) : op;
  return OP_LABELS[key] ?? '변형 공격'; // 폴백: raw 토큰 노출 금지
}

// ── ATLAS 기법코드 → 터미널 로그용 한글 라벨(풀네임) ──
// shared/constants의 ATLAS_KO_LABELS보다 목표 시작/결과줄에 맞춘 표현을 쓴다.
const ATLAS_TERM_LABELS: Record<string, string> = {
  'AML.T0054': '탈옥',
  'AML.T0051': '프롬프트 인젝션',
  'AML.T0051.000': '직접 프롬프트 인젝션',
  'AML.T0051.001': '간접 프롬프트 인젝션',
  'AML.T0056': '시스템 프롬프트 유출',
  'AML.T0057': '데이터 유출',
  'AML.T0053': '에이전트 도구 악용',
  'AML.T0048': '데이터 추출',
  'AML.T0052': '역할극 공격',
};

/**
 * ATLAS 코드 → 한글 기법명. 세부코드(AML.T0051.000)는 상위(AML.T0051)로 폴백,
 * 그래도 없으면 코드 그대로(목표 시작줄은 코드를 따로 병기하므로 최후 폴백만 해당).
 */
export function atlasTermLabel(code: string | null | undefined): string {
  if (!code) return '알 수 없는 기법';
  if (ATLAS_TERM_LABELS[code]) return ATLAS_TERM_LABELS[code];
  const base = code.split('.').slice(0, 2).join('.'); // 'AML.T0051.000' → 'AML.T0051'
  return ATLAS_TERM_LABELS[base] ?? code;
}

// 판정(verdict) → 한글 결과 문구
export const VERDICT_WORD: Record<string, string> = {
  safe: '방어 성공',
  breach: '취약점 발견',
  error: '응답 없음 — 건너뜀',
};

/** judge score(0~1) → 위험도 정수 퍼센트. 예: 0.2 → 20. */
export function riskPct(score: number | null | undefined): number {
  return Math.round((score ?? 0) * 100);
}
