# Frontend Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Initialize the frontend-only Vite, React, and TypeScript application described by `SA.png` and the approved design.

**Architecture:** The app uses Vite for local development and production builds, React Router for route wiring, and Axios for future backend calls. Application wiring lives in `src/app`, route pages live in `src/pages`, reusable layout UI lives in `src/components`, and future backend access is centralized in `src/api/client.ts`.

**Tech Stack:** Vite, React, TypeScript, React Router DOM, Axios, plain CSS.

---

## File Map

- Create: `package.json` for frontend scripts and dependencies.
- Create: `index.html` as the Vite browser entry document.
- Create: `tsconfig.json` for application TypeScript settings.
- Create: `tsconfig.app.json` for browser application TypeScript settings.
- Create: `tsconfig.node.json` for Vite config TypeScript settings.
- Create: `vite.config.ts` for React plugin integration and local dev server settings.
- Create: `.env.example` with `VITE_API_BASE_URL`.
- Create: `.gitignore` for frontend-generated files.
- Modify: `README.md` with frontend setup commands.
- Create: `src/main.tsx` as the React DOM entry point.
- Create: `src/app/App.tsx` as the root React component.
- Create: `src/app/router.tsx` as the route definition.
- Create: `src/pages/HomePage.tsx` as the initial route page.
- Create: `src/components/layout/AppLayout.tsx` as the app shell.
- Create: `src/api/client.ts` as the Axios client placeholder.
- Create: `src/styles/globals.css` for base styling.
- Create: `src/features/.gitkeep`, `src/shared/constants/.gitkeep`, `src/shared/utils/.gitkeep`, and `src/types/.gitkeep` to preserve the planned directories.

---

### Task 1: Create Project Configuration

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `tsconfig.json`
- Create: `tsconfig.app.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `.env.example`
- Create: `.gitignore`
- Modify: `README.md`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "team-f-frontend",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "typecheck": "tsc -b"
  },
  "dependencies": {
    "@vitejs/plugin-react": "latest",
    "axios": "latest",
    "react": "latest",
    "react-dom": "latest",
    "react-router-dom": "latest",
    "vite": "latest"
  },
  "devDependencies": {
    "@types/react": "latest",
    "@types/react-dom": "latest",
    "typescript": "latest"
  }
}
```

- [ ] **Step 2: Create `index.html`**

```html
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Team-F Frontend</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 3: Create `tsconfig.json`**

```json
{
  "files": [],
  "references": [
    {
      "path": "./tsconfig.node.json"
    },
    {
      "path": "./tsconfig.app.json"
    }
  ]
}
```

- [ ] **Step 4: Create `tsconfig.app.json`**

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "include": ["src"]
}
```

- [ ] **Step 5: Create `tsconfig.node.json`**

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
    "target": "ES2023",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "Bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 6: Create `vite.config.ts`**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
});
```

- [ ] **Step 7: Create `.env.example`**

```text
VITE_API_BASE_URL=
```

- [ ] **Step 8: Create `.gitignore`**

```gitignore
node_modules
dist
.env
.env.local
.env.*.local
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
*.tsbuildinfo
```

- [ ] **Step 9: Update `README.md`**

````md
# Team-F Frontend

Frontend application for 2026 Techeer Summer Bootcamp Team-F.

## Stack

- Vite
- React
- TypeScript
- React Router DOM
- Axios

## Getting Started

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Environment

Copy `.env.example` to `.env` and set values as needed.

```text
VITE_API_BASE_URL=
```
````

- [ ] **Step 10: Verify configuration files are present**

Run: `rg --files`

Expected output includes:

```text
package.json
index.html
tsconfig.json
tsconfig.app.json
tsconfig.node.json
vite.config.ts
.env.example
.gitignore
README.md
```

- [ ] **Step 11: Commit project configuration**

```bash
git add package.json index.html tsconfig.json tsconfig.app.json tsconfig.node.json vite.config.ts .env.example .gitignore README.md
git commit -m "chore: initialize frontend config"
```

---

### Task 2: Create React Application Structure

**Files:**
- Create: `src/main.tsx`
- Create: `src/app/App.tsx`
- Create: `src/app/router.tsx`
- Create: `src/pages/HomePage.tsx`
- Create: `src/components/layout/AppLayout.tsx`
- Create: `src/api/client.ts`
- Create: `src/styles/globals.css`
- Create: `src/features/.gitkeep`
- Create: `src/shared/constants/.gitkeep`
- Create: `src/shared/utils/.gitkeep`
- Create: `src/types/.gitkeep`

- [ ] **Step 1: Create `src/main.tsx`**

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './app/router';
import './styles/globals.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
```

- [ ] **Step 2: Create `src/app/App.tsx`**

```tsx
import { Outlet } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';

export function App() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}
```

- [ ] **Step 3: Create `src/app/router.tsx`**

```tsx
import { createBrowserRouter } from 'react-router-dom';
import { App } from './App';
import { HomePage } from '../pages/HomePage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
    ],
  },
]);
```

- [ ] **Step 4: Create `src/pages/HomePage.tsx`**

```tsx
export function HomePage() {
  return (
    <section className="home-page" aria-labelledby="home-title">
      <p className="eyebrow">Team-F Frontend</p>
      <h1 id="home-title">Vite, React, TypeScript foundation</h1>
      <p className="home-page__description">
        Frontend-only project structure is ready for future API integration.
      </p>
    </section>
  );
}
```

- [ ] **Step 5: Create `src/components/layout/AppLayout.tsx`**

```tsx
import type { PropsWithChildren } from 'react';

export function AppLayout({ children }: PropsWithChildren) {
  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <span className="app-shell__brand">Team-F</span>
      </header>
      <main className="app-shell__main">{children}</main>
    </div>
  );
}
```

- [ ] **Step 6: Create `src/api/client.ts`**

```ts
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || undefined,
  headers: {
    'Content-Type': 'application/json',
  },
});
```

- [ ] **Step 7: Create `src/styles/globals.css`**

```css
:root {
  color: #172026;
  background: #f5f7f9;
  font-family:
    Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
    sans-serif;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

* {
  box-sizing: border-box;
}

body {
  min-width: 320px;
  min-height: 100vh;
  margin: 0;
}

button,
input,
textarea,
select {
  font: inherit;
}

.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-shell__header {
  height: 64px;
  display: flex;
  align-items: center;
  padding: 0 32px;
  border-bottom: 1px solid #d8dee4;
  background: #ffffff;
}

.app-shell__brand {
  font-size: 18px;
  font-weight: 700;
}

.app-shell__main {
  width: min(100%, 1120px);
  margin: 0 auto;
  padding: 56px 24px;
}

.home-page {
  max-width: 720px;
}

.eyebrow {
  margin: 0 0 12px;
  color: #0f766e;
  font-size: 14px;
  font-weight: 700;
  text-transform: uppercase;
}

.home-page h1 {
  margin: 0;
  font-size: clamp(36px, 6vw, 64px);
  line-height: 1;
}

.home-page__description {
  margin: 24px 0 0;
  color: #4b5563;
  font-size: 18px;
  line-height: 1.6;
}

@media (max-width: 640px) {
  .app-shell__header {
    padding: 0 20px;
  }

  .app-shell__main {
    padding: 40px 20px;
  }
}
```

- [ ] **Step 8: Create empty planned directories**

Create these placeholder files:

```text
src/features/.gitkeep
src/shared/constants/.gitkeep
src/shared/utils/.gitkeep
src/types/.gitkeep
```

- [ ] **Step 9: Verify source files are present**

Run: `rg --files src`

Expected output includes:

```text
src/main.tsx
src/app/App.tsx
src/app/router.tsx
src/pages/HomePage.tsx
src/components/layout/AppLayout.tsx
src/api/client.ts
src/styles/globals.css
src/features/.gitkeep
src/shared/constants/.gitkeep
src/shared/utils/.gitkeep
src/types/.gitkeep
```

- [ ] **Step 10: Commit React structure**

```bash
git add src
git commit -m "feat: add frontend application structure"
```

---

### Task 3: Install Dependencies And Verify

**Files:**
- Create: `package-lock.json`
- Modify: `package.json` if npm normalizes dependency ranges.

- [ ] **Step 1: Install dependencies**

Run:

```bash
npm install
```

Expected:

```text
added ...
found 0 vulnerabilities
```

If npm reports vulnerabilities, keep the install result and report the exact `npm audit` summary before changing dependency versions.

- [ ] **Step 2: Run the TypeScript and Vite production build**

Run:

```bash
npm run build
```

Expected:

```text
> team-f-frontend@0.1.0 build
> tsc -b && vite build

dist/
```

- [ ] **Step 3: Start the local dev server**

Run:

```bash
npm run dev -- --host 127.0.0.1
```

Expected:

```text
Local: http://127.0.0.1:5173/
```

- [ ] **Step 4: Commit lockfile and verified dependency metadata**

```bash
git add package.json package-lock.json
git commit -m "chore: install frontend dependencies"
```

---

## Self-Review

Spec coverage:

- Vite, React, and TypeScript setup is covered by Task 1 and Task 3.
- React Router wiring is covered by Task 2.
- Axios API client placeholder and `VITE_API_BASE_URL` are covered by Task 1 and Task 2.
- The planned frontend folder structure is covered by Task 2.
- Backend, Docker, Nginx, AWS, monitoring, and CI files are intentionally excluded.

Placeholder scan:

- The plan does not use incomplete placeholder markers or unspecified implementation steps.
- Code-producing steps include complete file contents.
- Verification steps include exact commands and expected results.

Type consistency:

- `router` is exported from `src/app/router.tsx` and imported by `src/main.tsx`.
- `App` is exported from `src/app/App.tsx` and imported by `src/app/router.tsx`.
- `HomePage` is exported from `src/pages/HomePage.tsx` and imported by `src/app/router.tsx`.
- `AppLayout` accepts `PropsWithChildren` and is used by `App`.
