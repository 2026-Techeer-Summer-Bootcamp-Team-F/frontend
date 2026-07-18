import { createBrowserRouter } from 'react-router-dom';
import { App } from './App';
import { LoginPage } from '../pages/LoginPage';
import { GuidePage } from '../pages/GuidePage';
import { AuthCallbackPage } from '../pages/AuthCallbackPage';
import { GitHubLogoutCallbackPage } from '../pages/GitHubLogoutCallbackPage';
import { GitHubLogoutRedirectPage } from '../pages/GitHubLogoutRedirectPage';
import { ImportRepoPage } from '../pages/ImportRepoPage';
import { RegisterTargetPage } from '../pages/RegisterTargetPage';
import { RunScanPage } from '../pages/RunScanPage';
import { ReportPage } from '../pages/ReportPage';

export const router = createBrowserRouter([
  { path: '/', element: <LoginPage /> },
  { path: '/guide', element: <GuidePage /> },
  { path: '/auth/callback', element: <AuthCallbackPage /> },
  { path: '/auth/logout-callback', element: <GitHubLogoutCallbackPage /> },
  { path: '/auth/logout-redirect', element: <GitHubLogoutRedirectPage /> },

  // 인증 후 앱: AppLayout(다크 셸) 포함
  {
    element: <App />,
    children: [
      // ③ Import Git Repository
      { path: 'repos', element: <ImportRepoPage /> },
      { path: 'projects/new', element: <RegisterTargetPage /> },
      // ⑤ AI Red Teaming Analysis (스캔 실행 + SSE)
      { path: 'analysis/:projectId', element: <RunScanPage /> },
      // ⑥ 결과 리포트
      { path: 'report/:scanId', element: <ReportPage /> },
    ],
  },
]);
