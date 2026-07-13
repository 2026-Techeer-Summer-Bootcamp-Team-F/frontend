import { useEffect } from 'react';

export function GitHubLogoutCallbackPage() {
  useEffect(() => {
    if (window.opener) {
      window.opener.postMessage({ type: 'github-logout-done' }, window.location.origin);
    }
    window.close();
  }, []);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'monospace', color: '#a3ffae' }}>
      로그아웃 완료 중...
    </div>
  );
}
