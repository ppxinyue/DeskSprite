import type { ReactNode } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SettingsLayoutProps {
  children: ReactNode;
  sidebar: ReactNode;
}

export function SettingsLayout({ children, sidebar }: SettingsLayoutProps) {
  return (
    <div className="relative flex h-screen w-screen overflow-hidden bg-[radial-gradient(circle_at_18%_0%,rgba(255,255,255,0.88),transparent_34%),linear-gradient(135deg,#f6f7f9_0%,#e8edf3_46%,#f7f8fa_100%)] text-foreground antialiased dark:bg-[radial-gradient(circle_at_16%_0%,rgba(255,255,255,0.10),transparent_34%),linear-gradient(135deg,#111318_0%,#171b21_48%,#0f1115_100%)]">
      <div className="app-drag-region fixed left-0 right-0 top-0 z-[9999] h-14" />
      <aside className="glass-panel flex w-[200px] shrink-0 flex-col rounded-none border-y-0 border-l-0 bg-white/34 dark:bg-white/[0.045]">
        <div className="h-14 shrink-0" />
        <nav className="app-no-drag flex-1 space-y-1 px-2 pb-4">
          {sidebar}
        </nav>
      </aside>
      <main className="min-w-0 flex-1">
        <ScrollArea className="h-full">
          <div className="app-no-drag mt-14 max-w-[760px] px-4 pb-6">
            {children}
          </div>
        </ScrollArea>
      </main>
    </div>
  );
}
