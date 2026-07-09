import { createBrowserRouter } from 'react-router-dom';
import { App } from './App';
import { LoginPage } from '../pages/LoginPage';
import { RegisterTargetPage } from '../pages/RegisterTargetPage';
import { RunScanPage } from '../pages/RunScanPage';
import { DashboardPage } from '../pages/DashboardPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <LoginPage /> },
      { path: 'targets/new', element: <RegisterTargetPage /> },
      { path: 'scans/:targetId', element: <RunScanPage /> },
      { path: 'dashboard/:scanId', element: <DashboardPage /> },
    ],
  },
]);
