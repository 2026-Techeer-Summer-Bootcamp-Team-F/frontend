import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createProject, detectConfig } from '../api/projects';
import styles from './RegisterTargetPage.module.css';

// 흔한 챗봇 API 프리셋 — 자동감지 실패 시 원클릭 폴백(promptfoo/garak식).
const PRESETS: Record<string, { label: string; body_template: string; response_path: string }> = {
  general: { label: '일반 챗봇', body_template: '{"message": "{{prompt}}"}', response_path: 'reply' },
  openai: {
    label: 'OpenAI 호환',
    body_template: '{"messages":[{"role":"user","content":"{{prompt}}"}]}',
    response_path: '$.choices[0].message.content',
  },
  ollama: {
    label: 'Ollama',
    body_template: '{"model":"llama3.2","messages":[{"role":"user","content":"{{prompt}}"}],"stream":false}',
    response_path: '$.message.content',
  },
};

type DetectState = 'idle' | 'detecting' | 'detected' | 'failed';

export function RegisterTargetPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const repoFullName = params.get('repo') ?? '';
  const repoUrl = params.get('url') ?? '';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detect, setDetect] = useState<DetectState>('idle');

  const [form, setForm] = useState({
    project_name: repoFullName.split('/')[1] ?? '',
    url: '',
    method: 'POST',
    body_template: '{"message": "{{prompt}}"}',
    response_path: 'reply',
    purpose: '',
    system_prompt: '',
    repo_url: repoFullName ? `https://github.com/${repoFullName}` : '',
    actor_type: 'http' as 'http' | 'browser',
  });

  // 진입 시 레포가 있으면 자동감지 → 성공하면 body_template·response_path 프리필.
  useEffect(() => {
    if (!repoFullName) return;
    setDetect('detecting');
    detectConfig({ repo_url: `https://github.com/${repoFullName}` })
      .then(res => {
        if (res.detected && res.config) {
          setForm(prev => ({
            ...prev,
            url: res.config!.url ?? prev.url,
            body_template: res.config!.body_template ?? prev.body_template,
            response_path: res.config!.response_path ?? prev.response_path,
            method: res.config!.method ?? prev.method,
          }));
          setDetect('detected');
        } else {
          setDetect('failed');
        }
      })
      .catch(() => setDetect('failed'));
  }, [repoFullName]);

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [k]: e.target.value }));

  const applyPreset = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const p = PRESETS[e.target.value];
    if (p) setForm(prev => ({ ...prev, body_template: p.body_template, response_path: p.response_path }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const payload = {
      project_name: form.project_name,
      actor_type: form.actor_type,
      config: {
        url: form.url,
        method: form.method,
        body_template: form.body_template,
        response_path: form.response_path,
      },
      purpose: form.purpose || undefined,
      system_prompt: form.system_prompt || undefined,
      repo_url: form.repo_url || undefined,
    };
    try {
      const project = await createProject(payload);
      navigate(`/analysis/${project.target_id}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '프로젝트 등록에 실패했습니다.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <p className={styles.label}>STEP 2 / 3</p>
        <h1 className={styles.title}>
          필요 정보 <span className={styles.accent}>입력</span>
        </h1>
        {repoFullName && (
          <p className={styles.repoTag}>
            <span className={styles.repoIcon}>⌥</span> {repoFullName}
          </p>
        )}
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        <section className={styles.card}>
          <div className={styles.macBar}>
            <span className={`${styles.macDot} ${styles.macG}`} />
            <span className={`${styles.macDot} ${styles.macY}`} />
            <span className={`${styles.macDot} ${styles.macR}`} />
            <span className={styles.macTitle}>필요 정보 입력</span>
          </div>
          <div className={styles.cardInner}>
            {/* 자동감지 상태 */}
            {detect === 'detecting' && (
              <p className={styles.detectMsg}>⟳ 레포에서 연결 정보 자동 감지 중…</p>
            )}
            {detect === 'detected' && (
              <p className={`${styles.detectMsg} ${styles.detectOk}`}>
                ✓ 레포에서 연결 정보를 자동으로 채웠어요. URL만 확인하면 됩니다.
              </p>
            )}
            {detect === 'failed' && (
              <p className={styles.detectMsg}>
                자동 감지가 안 됐어요. 아래 <b>프리셋</b>을 고르거나 직접 입력하세요.
              </p>
            )}

            <div className={styles.grid}>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>프로젝트 이름</label>
                <input className={styles.input} value={form.project_name} onChange={set('project_name')} required />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>프리셋</label>
                <select className={styles.input} defaultValue="" onChange={applyPreset}>
                  <option value="" disabled>API 형태 선택…</option>
                  {Object.entries(PRESETS).map(([k, p]) => (
                    <option key={k} value={k}>{p.label}</option>
                  ))}
                </select>
              </div>
              <div className={`${styles.field} ${styles.spanFull}`}>
                <label className={styles.fieldLabel}>엔드포인트 URL <span className={styles.required}>*</span></label>
                <input className={styles.input} type="url" placeholder="http://localhost:8080/chat" value={form.url} onChange={set('url')} required />
              </div>
            </div>

            {/* 고급 설정 — 자동/프리셋으로 채워짐, 필요시만 펼침 */}
            <details className={styles.advanced}>
              <summary className={styles.advancedSummary}>고급 설정 (자동으로 채워짐 · 필요시 수정)</summary>
              <div className={styles.grid}>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>연결 방식</label>
                  <select className={styles.input} value={form.actor_type} onChange={set('actor_type')}>
                    <option value="http">HTTP</option>
                    <option value="browser">Browser (Playwright)</option>
                  </select>
                </div>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>HTTP Method</label>
                  <select className={styles.input} value={form.method} onChange={set('method')}>
                    <option>POST</option><option>GET</option><option>PUT</option>
                  </select>
                </div>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>응답 경로 (response_path)</label>
                  <input className={styles.input} placeholder="reply" value={form.response_path} onChange={set('response_path')} />
                </div>
                <div className={`${styles.field} ${styles.spanFull}`}>
                  <label className={styles.fieldLabel}>Body 템플릿 <code className={styles.code}>{'{{prompt}}'}</code> 위치 명시</label>
                  <textarea className={styles.textarea} rows={3} value={form.body_template} onChange={set('body_template')} />
                </div>
              </div>
            </details>
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.macBar}>
            <span className={`${styles.macDot} ${styles.macG}`} />
            <span className={`${styles.macDot} ${styles.macY}`} />
            <span className={`${styles.macDot} ${styles.macR}`} />
            <span className={styles.macTitle}>선택 정보</span>
          </div>
          <div className={styles.cardInner}><div className={styles.grid}>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>앱 용도</label>
              <input className={styles.input} placeholder="고객지원 챗봇" value={form.purpose} onChange={set('purpose')} />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>GitHub 리포 URL</label>
              <input className={styles.input} value={form.repo_url} onChange={set('repo_url')} />
            </div>
            <div className={`${styles.field} ${styles.spanFull}`}>
              <label className={styles.fieldLabel}>시스템 프롬프트 (알고 있다면)</label>
              <textarea className={styles.textarea} rows={3} value={form.system_prompt} onChange={set('system_prompt')} />
            </div>
          </div></div>
        </section>

        {error && <p className={styles.error}>⚠ {error}</p>}

        <button className={styles.submitBtn} type="submit" disabled={loading}>
          {loading ? '등록 중...' : '›_ 프로젝트 등록 → 분석 설정'}
        </button>
      </form>
    </div>
  );
}
