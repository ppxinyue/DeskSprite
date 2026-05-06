import type { ReactNode } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SettingsLayoutProps {
  children: ReactNode;
  sidebar: ReactNode;
}

export function SettingsLayout({ children, sidebar }: SettingsLayoutProps) {
  return (
    <div className="flex h-screen w-screen bg-background text-foreground antialiased">
      <aside className="w-56 shrink-0 border-r border-border/50 flex flex-col bg-muted/50 backdrop-blur-xl">
        <div className="px-5 pb-3 pt-6">
          <h1 className="text-xl font-semibold text-foreground">
            DeskSprite
          </h1>
        </div>
        <nav className="flex-1 px-3 pb-4 space-y-1">
          {sidebar}
        </nav>
      </aside>
      <main className="flex-1 min-w-0">
        <ScrollArea className="h-full">
          <div className="px-12 py-10 max-w-2xl">
            {children}
          </div>
        </ScrollArea>
      </main>
    </div>
  );
}
