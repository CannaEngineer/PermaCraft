'use client';

import { Home, Map, Leaf, GraduationCap, MessageSquare } from 'lucide-react';
import { useUnifiedCanvas, type CanvasSection } from '@/contexts/unified-canvas-context';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

/**
 * Desktop nav rail — mirrors mobile nav for consistency (5 items).
 *
 * Removed: Explore (accessible from Home), Shop (accessible from farm menu / profile).
 * Users learn one navigation model that works identically on both form factors.
 */
const navItems: { id: CanvasSection; icon: typeof Home; label: string; shortcut: string }[] = [
  { id: 'home', icon: Home, label: 'Home', shortcut: '1' },
  { id: 'farm', icon: Map, label: 'Farm', shortcut: '2' },
  { id: 'plants', icon: Leaf, label: 'Plants', shortcut: '3' },
  { id: 'learn', icon: GraduationCap, label: 'Learn', shortcut: '4' },
  { id: 'ai', icon: MessageSquare, label: 'AI', shortcut: '5' },
];

export function NavRail() {
  const { activeSection, setActiveSection } = useUnifiedCanvas();
  const router = useRouter();

  return (
    <nav
      className="hidden md:flex flex-col items-center w-16 py-3 gap-1 glass-panel-strong border-r border-border/40"
      aria-label="Main navigation"
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeSection === item.id;

        return (
          <button
            key={item.id}
            onClick={() => {
              if (item.id === 'home') {
                router.push('/dashboard');
                return;
              }
              setActiveSection(item.id);
            }}
            className={cn(
              'relative flex flex-col items-center justify-center w-14 h-auto py-1.5 px-1 rounded-xl transition-all duration-200 group gap-0.5',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
              isActive
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            )}
            aria-label={item.label}
            aria-current={isActive ? 'page' : undefined}
            title={`${item.label} (${item.shortcut})`}
          >
            <Icon className="h-4 w-4" strokeWidth={isActive ? 2.5 : 2} />
            <span className="text-[9px] leading-tight font-medium">{item.label}</span>

            {/* Tooltip on hover */}
            <div
              className="absolute left-full ml-2 px-2 py-1 rounded-md bg-popover text-popover-foreground text-xs font-medium shadow-md border border-border/40 invisible group-hover:visible opacity-0 group-hover:opacity-100 pointer-events-none transition-all whitespace-nowrap z-50"
              aria-hidden="true"
            >
              {item.label}
              <span className="ml-1.5 text-muted-foreground">{item.shortcut}</span>
            </div>
          </button>
        );
      })}
    </nav>
  );
}
