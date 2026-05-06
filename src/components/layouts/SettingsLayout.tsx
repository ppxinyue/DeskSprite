import type { ReactNode } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SettingsLayoutProps {
  children: ReactNode;
  sidebar: ReactNode;
}

export function SettingsLayout({ children, sidebar }: SettingsLayoutProps) {
  return (
    <div className="flex h-screen w-screen bg-[#f5f5f7] text-foreground antialiased dark:bg-background">
      <aside className="w-56 shrink-0 border-r border-black/10 flex flex-col bg-[#ededf0]/90 dark:border-border/60 dark:bg-muted/50">
        <div className="px-5 pb-3 pt-8">
          <h1 className="text-[20px] font-semibold tracking-[-0.01em] text-foreground">
            DeskSprite
          </h1>
        </div>
        <nav className="flex-1 px-3 pb-4 space-y-1">
          {sidebar}
        </nav>
      </aside>
      <main className="flex-1 min-w-0">
        <ScrollArea className="h-full">
          <div className="px-10 py-9 max-w-[760px]">
            {children}
          </div>
        </ScrollArea>
      </main>
    </div>
  );
}
