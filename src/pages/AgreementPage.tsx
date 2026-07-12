import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import styles from './AgreementPage.module.css';

const TERMS_BODY = `1. 목적
본 약관은 본 플랫폼이 이용자가 등록한 대상 애플리케이션(이하 "타겟")에 대해 자동화된 프롬프트 공격을 실행하여 보안 취약점을 진단하는 서비스임을 고지하고, 이에 대한 이용자의 동의 및 책임 범위를 명확히 하기 위해 작성되었습니다.

2. 서비스 내용 (동의 대상)
이용자가 타겟을 등록하고 스캔을 실행하면, 본 도구는 다음을 수행합니다.
• 타겟에 정찰(Reconnaissance) 목적의 프로브 요청 전송
• MITRE ATLAS 기반으로 분류된 프롬프트 공격(Jailbreak, Prompt Injection, Data Leakage 등)을 자동 생성하여 타겟에 전송
• 타겟의 응답을 수집·분석하여 공격 성공/실패 여부 판정
• 위 과정에서 발생한 프롬프트·응답·판정 결과를 데이터베이스에 저장

본 스캔은 실제 공격과 동일한 방식의 요청을 전송합니다. 이 과정에서 타겟이 의도치 않은 방식으로 작동하거나(예: 비정상 응답, 리소스 사용량 증가), 유해하거나 불쾌하게 느껴질 수 있는 내용이 포함된 프롬프트·응답이 생성될 수 있습니다.

3. 데이터 처리 및 저장
• 스캔 과정에서 생성된 프롬프트, 타겟의 응답, 판정 결과는 재현성·근거 확보를 위해 데이터베이스에 영구 저장됩니다.
• 저장된 기록은 결과 대시보드·이력 조회, 동일 타겟 재스캔 시 이전 공격 전략 참고 용도로만 사용되며, 타겟 소유자의 동의 없이 제3자에게 제공되거나 다른 타겟의 분석에 사용되지 않습니다.
• 타겟의 응답에 개인정보나 민감정보가 포함되어 저장될 가능성이 있으므로, 이용자는 이 점을 인지하고 본인 책임 하에 스캔을 진행합니다.

4. 면책 조항
• 본 플랫폼은 "있는 그대로(as-is)" 제공되며, 발견되지 않은 취약점의 부재를 보장하지 않습니다.
• 본 플랫폼 사용으로 인해 타겟 서비스에 발생하는 직접적·간접적 손해에 대해 개발팀은 책임을 지지 않습니다. 관련 책임은 타겟 등록 시 소유권/권한을 확인한 이용자에게 있습니다.
• 본 플랫폼이 생성하는 공격 프롬프트는 보안 테스트 목적으로만 제공되며, 이를 실제 제3자 공격에 사용하는 것은 엄격히 금지됩니다.

5. 금지 행위
• 동의 없는 제3자 소유 서비스에 대한 스캔
• 본 플랫폼을 이용해 생성된 공격 프롬프트를 실제 악의적 목적으로 사용하는 행위
• 법령에 위반되는 목적으로 본 도구를 사용하는 행위`;

const REQUIRED_AGREEMENTS = [
  '본인은 등록하는 타겟(URL/API 엔드포인트)의 소유자이거나, 소유자로부터 침투 테스트·보안 진단에 대한 명시적 서면 동의를 받았음을 확인합니다.',
  '본인의 동의 없이 제3자가 소유·운영하는 프로덕션 서비스를 타겟으로 등록하지 않을 것을 확인합니다.',
  '본 스캔으로 인해 타겟에 발생할 수 있는 모든 결과(서비스 영향, 데이터 노출 등)에 대한 책임은 본인에게 있음을 이해합니다.',
  '본 도구는 교육·연구 목적의 프로젝트이며, 상용 서비스 수준의 안정성·정확성을 보장하지 않음을 이해합니다.',
];

export function AgreementPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const repo = params.get('repo') ?? '';
  const url = params.get('url') ?? '';

  const [checks, setChecks] = useState<boolean[]>(REQUIRED_AGREEMENTS.map(() => false));
  const allAgreed = checks.every(Boolean);

  const toggleCheck = (i: number) =>
    setChecks(prev => prev.map((v, idx) => (idx === i ? !v : v)));

  const handleNext = () => {
    const query = new URLSearchParams();
    if (repo) query.set('repo', repo);
    if (url) query.set('url', url);
    navigate(`/projects/new?${query.toString()}`);
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <p className={styles.label}>STEP 1 / 3</p>
        <h1 className={styles.title}>
          이용약관 <span className={styles.accent}>동의</span>
        </h1>
        {repo && (
          <p className={styles.repoTag}>
            <span className={styles.repoIcon}>⌥</span> {repo}
          </p>
        )}
      </div>

      <section className={styles.card}>
        <div className={styles.macBar}>
          <span className={`${styles.macDot} ${styles.macG}`} />
          <span className={`${styles.macDot} ${styles.macY}`} />
          <span className={`${styles.macDot} ${styles.macR}`} />
          <span className={styles.macTitle}>이용약관 및 스캔 동의서</span>
        </div>
        <div className={styles.cardInner}>
          <pre className={styles.terms}>{TERMS_BODY}</pre>

          <div className={styles.agreeDivider}>
            <span className={styles.agreeDividerLabel}>이용자 확인사항 (필수 동의)</span>
          </div>
          <div className={styles.checkList}>
            {REQUIRED_AGREEMENTS.map((text, i) => (
              <label key={i} className={`${styles.agreeRow} ${checks[i] ? styles.agreeChecked : ''}`}>
                <input
                  type="checkbox"
                  className={styles.checkbox}
                  checked={checks[i]}
                  onChange={() => toggleCheck(i)}
                />
                <span>{text}</span>
              </label>
            ))}
          </div>
          <p className={styles.agreeNote}>위 항목 중 하나라도 동의하지 않으면 스캔은 실행되지 않습니다.</p>
        </div>
      </section>

      <button className={styles.nextBtn} onClick={handleNext} disabled={!allAgreed}>
        ›_ 동의하고 액터 구성으로 →
      </button>
    </div>
  );
}
