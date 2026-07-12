import { createBrowserRouter } from 'react-router-dom';
import { App } from './App';
import { LoginPage } from '../pages/LoginPage';
import { AuthCallbackPage } from '../pages/AuthCallbackPage';
import { ImportRepoPage } from '../pages/ImportRepoPage';
import { AgreementPage } from '../pages/AgreementPage';
import { RegisterTargetPage } from '../pages/RegisterTargetPage';
import { RunScanPage } from '../pages/RunScanPage';
import { ReportPage } from '../pages/ReportPage';

export const router = createBrowserRouter([
  { path: '/', element: <LoginPage /> },
  { path: '/auth/callback', element: <AuthCallbackPage /> },

  // 인증 후 앱: AppLayout(다크 셸) 포함
  {
    element: <App />,
    children: [
      // ③ Import Git Repository
      { path: 'repos', element: <ImportRepoPage /> },
      { path: 'agreement', element: <AgreementPage /> },
      { path: 'projects/new', element: <RegisterTargetPage /> },
      // ⑤ AI Red Teaming Analysis (스캔 실행 + SSE)
      { path: 'analysis/:projectId', element: <RunScanPage /> },
      // ⑥ 결과 리포트
      { path: 'report/:scanId', element: <ReportPage /> },
    ],
  },
]);
