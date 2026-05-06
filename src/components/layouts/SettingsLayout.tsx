import type { ReactNode } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SettingsLayoutProps {
  children: ReactNode;
  sidebar: ReactNode;
}

export function SettingsLayout({ children, sidebar }: SettingsLayoutProps) {
  return (
    <div className="flex h-screen w-screen bg-background text-foreground antialiased">
      <aside className="w-52 shrink-0 border-r border-border/60 flex flex-col bg-muted/30">
        <div className="px-5 py-5">
          <h1 className="text-sm font-semibold tracking-wide text-foreground/50 uppercase">
            DeskSprite
          </h1>
        </div>
        <nav className="flex-1 px-3 pb-4 space-y-0.5">
          {sidebar}
        </nav>
      </aside>
      <main className="flex-1 min-w-0">
        <ScrollArea className="h-full">
          <div className="px-10 py-8 max-w-xl">
            {children}
          </div>
        </ScrollArea>
      </main>
    </div>
  );
}
