import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { handleGitHubCallback } from '../api/auth';
import { saveToken } from '../utils/auth';

export function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state') ?? '';

    if (!code) {
      setError('GitHub 인증 코드가 없습니다.');
      return;
    }

    handleGitHubCallback(code, state)
      .then(({ access_token }) => {
        saveToken(access_token);
        navigate('/repos', { replace: true });
      })
      .catch(() => {
        setError('GitHub 로그인에 실패했습니다. 다시 시도해주세요.');
      });
  }, []);

  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '16px', fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif", color: '#ff6b6b' }}>
        <span>{error}</span>
        <button
          onClick={() => navigate('/', { replace: true })}
          style={{ background: 'none', border: '1px solid #ff6b6b', color: '#ff6b6b', padding: '8px 16px', cursor: 'pointer', fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif" }}
        >
          홈으로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif", color: '#a3ffae' }}>
      GitHub 인증 중...
    </div>
  );
}
