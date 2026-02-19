'use client';

import { Home, Map, Globe, Leaf, MessageSquare } from 'lucide-react';
import { useUnifiedCanvas, type CanvasSection } from '@/contexts/unified-canvas-context';
import { cn } from '@/lib/utils';

const mobileNavItems: { id: CanvasSection; icon: typeof Home; label: string }[] = [
  { id: 'home', icon: Home, label: 'Home' },
  { id: 'farm', icon: Map, label: 'Farm' },
  { id: 'explore', icon: Globe, label: 'Explore' },
  { id: 'plants', icon: Leaf, label: 'Plants' },
  { id: 'ai', icon: MessageSquare, label: 'AI' },
];

export function CanvasMobileNav() {
  const { activeSection, setActiveSection } = useUnifiedCanvas();

  return (
    <nav className="md:hidden fixed inset-x-0 bottom-0 h-14 z-40 glass-panel-strong border-t border-border/40 flex items-center justify-around px-2">
      {mobileNavItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeSection === item.id;

        return (
          <button
            key={item.id}
            onClick={() => setActiveSection(item.id)}
            className={cn(
              'flex flex-col items-center justify-center gap-0.5 w-14 h-11 rounded-xl transition-all',
              isActive
                ? 'text-primary'
                : 'text-muted-foreground'
            )}
            aria-label={item.label}
          >
            <Icon className={cn('h-5 w-5', isActive && 'scale-110')} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
