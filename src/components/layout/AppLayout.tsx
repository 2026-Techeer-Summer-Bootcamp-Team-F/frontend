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
