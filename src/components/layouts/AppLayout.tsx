import type { ReactNode } from 'react';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex flex-col h-screen w-screen bg-transparent select-none overflow-hidden">
      {children}
    </div>
  );
}
