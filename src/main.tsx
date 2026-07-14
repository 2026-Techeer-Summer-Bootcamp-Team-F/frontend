import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './app/router';
import { apiClient } from './api/client';
import { getToken, saveToken } from './utils/auth';
import './styles/globals.css';

// 데모용 자동 인증: 백엔드가 보호(JWT)되므로, 토큰이 없으면 mock dev-login으로
// 토큰을 받아 저장한다(AUTH_MODE=mock 서버에서만 동작). 실패해도 앱은 그대로 렌더.
async function ensureDemoToken(): Promise<void> {
  if (getToken()) return;
  try {
    const { data } = await apiClient.post<{ access_token?: string }>('/auth/dev-login', {
      github_name: 'demo',
    });
    if (data?.access_token) saveToken(data.access_token);
  } catch {
    /* dev-login 불가(운영 GitHub 모드 등) — 무시하고 진행 */
  }
}

ensureDemoToken().finally(() => {
  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
      <RouterProvider router={router} />
    </React.StrictMode>,
  );
});
