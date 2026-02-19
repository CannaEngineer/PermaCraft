'use client';

import { Home, Map, Globe, Leaf, GraduationCap, MessageSquare } from 'lucide-react';
import { useUnifiedCanvas, type CanvasSection } from '@/contexts/unified-canvas-context';
import { cn } from '@/lib/utils';

const navItems: { id: CanvasSection; icon: typeof Home; label: string; shortcut: string }[] = [
  { id: 'home', icon: Home, label: 'Home', shortcut: '1' },
  { id: 'farm', icon: Map, label: 'Farm', shortcut: '2' },
  { id: 'explore', icon: Globe, label: 'Explore', shortcut: '3' },
  { id: 'plants', icon: Leaf, label: 'Plants', shortcut: '4' },
  { id: 'learn', icon: GraduationCap, label: 'Learn', shortcut: '5' },
  { id: 'ai', icon: MessageSquare, label: 'AI', shortcut: '6' },
];

export function NavRail() {
  const { activeSection, setActiveSection } = useUnifiedCanvas();

  return (
    <nav className="hidden md:flex flex-col items-center w-14 py-3 gap-1 glass-panel-strong border-r border-border/40">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeSection === item.id;

        return (
          <button
            key={item.id}
            onClick={() => setActiveSection(item.id)}
            className={cn(
              'relative flex flex-col items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 group',
              isActive
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            )}
            aria-label={item.label}
            title={`${item.label} (${item.shortcut})`}
          >
            <Icon className="h-[18px] w-[18px]" />

            {/* Tooltip on hover */}
            <div className="absolute left-full ml-2 px-2 py-1 rounded-md bg-popover text-popover-foreground text-xs font-medium shadow-md border border-border/40 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
              {item.label}
              <span className="ml-1.5 text-muted-foreground">{item.shortcut}</span>
            </div>
          </button>
        );
      })}
    </nav>
  );
}
