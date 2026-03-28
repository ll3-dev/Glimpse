import type { ReactNode } from 'react';

interface MainPanelProps {
  children: ReactNode;
}

export function MainPanel({ children }: MainPanelProps) {
  return (
    <main className="flex-1 overflow-auto">
      {children}
    </main>
  );
}
