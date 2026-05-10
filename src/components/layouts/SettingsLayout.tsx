import type { ReactNode } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SettingsLayoutProps {
  children: ReactNode;
  sidebar: ReactNode;
}

export function SettingsLayout({ children, sidebar }: SettingsLayoutProps) {
  return (
    <div className="settings-window relative flex h-screen w-screen overflow-hidden text-foreground antialiased">
      <div className="app-drag-region fixed left-0 right-0 top-0 z-[9999] h-14" />
      <aside className="settings-sidebar flex w-[210px] shrink-0 flex-col bg-white/30 shadow-[18px_0_54px_rgba(52,64,84,0.065),1px_0_0_rgba(255,255,255,0.48)_inset] backdrop-blur-[34px] dark:bg-[#252525] dark:shadow-[1px_0_0_rgba(255,255,255,0.08)]">
        <div className="h-14 shrink-0" />
        <nav className="app-no-drag flex-1 overflow-y-auto px-2.5 pb-5">
          {sidebar}
        </nav>
      </aside>
      <main className="settings-main min-w-0 flex-1">
        <ScrollArea className="h-full">
          <div className="app-no-drag mt-14 max-w-[720px] px-5 pb-7">
            {children}
          </div>
        </ScrollArea>
      </main>
    </div>
  );
}
