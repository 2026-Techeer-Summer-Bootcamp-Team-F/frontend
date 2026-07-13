import { useEffect } from 'react';

export function GitHubLogoutRedirectPage() {
  useEffect(() => {
    const returnTo = encodeURIComponent(window.location.origin + '/auth/logout-callback');
    window.location.href = `https://github.com/logout?return_to=${returnTo}`;
  }, []);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'monospace', color: '#a3ffae' }}>
      GitHub 로그아웃 중...
    </div>
  );
}
