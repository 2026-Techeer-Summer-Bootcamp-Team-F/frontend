import { createBrowserRouter } from 'react-router-dom';
import { App } from './App';
import { LoginPage } from '../pages/LoginPage';
import { RegisterTargetPage } from '../pages/RegisterTargetPage';
import { RunScanPage } from '../pages/RunScanPage';
import { DashboardPage } from '../pages/DashboardPage';

export const router = createBrowserRouter([
  // 로그인: AppLayout 없이 전체 화면
  { path: '/', element: <LoginPage /> },

  // 인증 후 앱: AppLayout 포함
  {
    element: <App />,
    children: [
      { path: 'targets/new', element: <RegisterTargetPage /> },
      { path: 'scans/:targetId', element: <RunScanPage /> },
      { path: 'dashboard/:scanId', element: <DashboardPage /> },
    ],
  },
]);
