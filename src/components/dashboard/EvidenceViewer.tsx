import type { Finding, Attempt } from '../../types';

interface Props {
  findings: Finding[];
  attempts: Attempt[];
}

export function EvidenceViewer({ findings, attempts }: Props) {
  const attemptMap = new Map(attempts.map((a) => [a.id, a]));

  return (
    <section>
      <h2>공격 증거</h2>
      {findings.length === 0 && <p>발견된 취약점 없음</p>}
      {findings.map((finding) => {
        const attempt = attemptMap.get(finding.attempt_id);
        return (
          <article key={finding.id}>
            <h3>{finding.attack_type}</h3>
            <p>ATLAS: {finding.atlas_technique_ids.join(', ')}</p>
            {attempt && (
              <>
                <details>
                  <summary>공격 프롬프트</summary>
                  <pre>{attempt.prompt_text}</pre>
                </details>
                <details>
                  <summary>응답 (증거)</summary>
                  <pre>{attempt.response_text}</pre>
                </details>
              </>
            )}
            {finding.evidence && (
              <details>
                <summary>카나리 매칭</summary>
                <pre>{finding.evidence}</pre>
              </details>
            )}
          </article>
        );
      })}
    </section>
  );
}
