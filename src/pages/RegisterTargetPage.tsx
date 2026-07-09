import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createTarget } from '../api/targets';
import type { CreateTargetPayload } from '../api/targets';

export function RegisterTargetPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<CreateTargetPayload>({
    name: '',
    endpoint_url: '',
    model_hint: '',
    system_prompt_hint: '',
    repo_url: '',
    actor_type: 'http',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const target = await createTarget(form);
      navigate(`/scans/${target.id}`);
    } catch {
      setError('대상 등록 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section>
      <h1>대상 앱 등록</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="name">앱 이름</label>
          <input
            id="name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>
        <div>
          <label htmlFor="endpoint_url">엔드포인트 URL</label>
          <input
            id="endpoint_url"
            type="url"
            value={form.endpoint_url}
            onChange={(e) => setForm({ ...form, endpoint_url: e.target.value })}
            required
          />
        </div>
        <div>
          <label htmlFor="model_hint">AI 모델 (선택)</label>
          <input
            id="model_hint"
            value={form.model_hint}
            onChange={(e) => setForm({ ...form, model_hint: e.target.value })}
          />
        </div>
        <div>
          <label htmlFor="repo_url">GitHub 리포지터리 URL (선택)</label>
          <input
            id="repo_url"
            type="url"
            value={form.repo_url}
            onChange={(e) => setForm({ ...form, repo_url: e.target.value })}
          />
        </div>
        {error && <p>{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? '등록 중...' : '스캔 대상 등록'}
        </button>
      </form>
    </section>
  );
}
