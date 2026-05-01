import type { ReactNode } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface SettingsLayoutProps {
  children: ReactNode;
  sidebar: ReactNode;
  title?: string;
}

export function SettingsLayout({ children, sidebar, title }: SettingsLayoutProps) {
  return (
    <div className="flex h-screen w-screen bg-background text-foreground">
      <aside className="w-56 border-r border-border flex flex-col">
        <div className="p-4 font-semibold text-sm">{title ?? '设置'}</div>
        <Separator />
        <ScrollArea className="flex-1">
          <nav className="p-2">{sidebar}</nav>
        </ScrollArea>
      </aside>
      <main className="flex-1 overflow-auto">
        <ScrollArea className="h-full">
          <div className="p-6 max-w-2xl">{children}</div>
        </ScrollArea>
      </main>
    </div>
  );
}
