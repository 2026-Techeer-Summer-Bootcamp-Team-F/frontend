import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createProject } from '../api/projects';
import styles from './RegisterTargetPage.module.css';

export function RegisterTargetPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const repoFullName = params.get('repo') ?? '';
  const repoUrl = params.get('url') ?? '';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    project_name: repoFullName.split('/')[1] ?? '',
    url: '',
    method: 'POST',
    body_template: '{"message": "{{prompt}}"}',
    response_path: 'reply',
    purpose: '',
    system_prompt: '',
    repo_url: repoUrl ? `https://github.com/${repoFullName}` : '',
    actor_type: 'http' as 'http' | 'browser',
  });

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [k]: e.target.value }));

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
          액터 <span className={styles.accent}>구성</span>
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
            <span className={styles.macTitle}>액터 구성</span>
          </div>
          <div className={styles.cardInner}><div className={styles.grid}>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>프로젝트 이름</label>
              <input className={styles.input} value={form.project_name} onChange={set('project_name')} required />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Actor 타입</label>
              <select className={styles.input} value={form.actor_type} onChange={set('actor_type')}>
                <option value="http">HTTP</option>
                <option value="browser">Browser (Playwright)</option>
              </select>
            </div>
            <div className={`${styles.field} ${styles.spanFull}`}>
              <label className={styles.fieldLabel}>엔드포인트 URL <span className={styles.required}>*</span></label>
              <input className={styles.input} type="url" placeholder="http://localhost:8080/chat" value={form.url} onChange={set('url')} required />
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
          </div></div>
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
