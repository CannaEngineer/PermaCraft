'use client';

import { Home, Map, Leaf, GraduationCap, MessageSquare } from 'lucide-react';
import { useUnifiedCanvas, type CanvasSection } from '@/contexts/unified-canvas-context';
import { cn } from '@/lib/utils';

/**
 * Mobile bottom nav — 5 items max (Google Material / Apple HIG best practice).
 *
 * Removed from primary nav:
 *   - Explore → accessible from Home panel (community feed)
 *   - Shop → accessible from profile sheet and farm menu
 *
 * This keeps the most-used actions within thumb reach while avoiding
 * the "too many tiny targets" anti-pattern.
 */
const mobileNavItems: { id: CanvasSection; icon: typeof Home; label: string }[] = [
  { id: 'home', icon: Home, label: 'Home' },
  { id: 'farm', icon: Map, label: 'Farm' },
  { id: 'plants', icon: Leaf, label: 'Plants' },
  { id: 'learn', icon: GraduationCap, label: 'Learn' },
  { id: 'ai', icon: MessageSquare, label: 'AI' },
];

export function CanvasMobileNav() {
  const { activeSection, setActiveSection } = useUnifiedCanvas();

  return (
    <nav
      className="md:hidden fixed inset-x-0 bottom-0 h-14 z-40 glass-panel-strong border-t border-border/40 flex items-center justify-around px-1 pb-[env(safe-area-inset-bottom)]"
      aria-label="Mobile navigation"
    >
      {mobileNavItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeSection === item.id;

        return (
          <button
            key={item.id}
            onClick={() => setActiveSection(item.id)}
            className={cn(
              'flex flex-col items-center justify-center gap-0.5 min-w-[48px] h-11 rounded-xl transition-all touch-manipulation active:scale-95',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              isActive
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground'
            )}
            aria-label={item.label}
            aria-current={isActive ? 'page' : undefined}
          >
            <div className={cn('relative transition-transform', isActive && 'scale-110')}>
              <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
              {isActive && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" aria-hidden="true" />
              )}
            </div>
            <span className={cn(
              'text-[10px] font-medium leading-none',
              isActive && 'text-primary'
            )}>
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
