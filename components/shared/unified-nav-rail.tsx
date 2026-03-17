'use client';

import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { getNavItems, isRouteActive } from '@/lib/nav/navigation';
import { MessageSquare } from 'lucide-react';
import type { CanvasSection } from '@/contexts/unified-canvas-context';

interface UnifiedNavRailProps {
  /** When inside the canvas, provide section state for section-based navigation */
  canvasContext?: {
    activeSection: string;
    setActiveSection: (section: CanvasSection) => void;
  };
}

/**
 * Unified desktop nav rail — single navigation component used across all pages.
 *
 * - On /dashboard: route-based navigation, primary item is "Farm"
 * - On /canvas: section-based navigation for Discover/Plants/Learn, primary item is "Dashboard"
 * - Consistent visual design everywhere
 */
export function UnifiedNavRail({ canvasContext }: UnifiedNavRailProps) {
  const pathname = usePathname();
  const router = useRouter();
  const navItems = getNavItems(pathname);
  const isCanvas = !!canvasContext;

  const handleClick = (item: typeof navItems[0]) => {
    // If in canvas and the item has a canvas section, switch section
    if (isCanvas && item.canvasSection && canvasContext) {
      canvasContext.setActiveSection(item.canvasSection as CanvasSection);
      return;
    }
    // Otherwise, navigate by route
    router.push(item.href);
  };

  const isActive = (item: typeof navItems[0]) => {
    if (isCanvas && item.canvasSection && canvasContext) {
      return canvasContext.activeSection === item.canvasSection;
    }
    // On canvas, the "Dashboard" link is never "active"
    if (isCanvas && item.id === 'dashboard') return false;
    // On dashboard pages, "Farm" link is active on /canvas
    if (!isCanvas && item.id === 'farm') return false;
    return isRouteActive(pathname, item.href);
  };

  return (
    <nav
      className="hidden md:flex flex-col items-center w-16 py-3 gap-1 bg-card/80 backdrop-blur-sm border-r border-border/40"
      aria-label="Main navigation"
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(item);

        return (
          <button
            key={item.id}
            onClick={() => handleClick(item)}
            className={cn(
              'relative flex flex-col items-center justify-center w-14 h-auto py-1.5 px-1 rounded-xl transition-all duration-200 group gap-0.5',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
              active
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            )}
            aria-label={item.label}
            aria-current={active ? 'page' : undefined}
          >
            <Icon className="h-4 w-4" strokeWidth={active ? 2.5 : 2} />
            <span className="text-[9px] leading-tight font-medium">{item.label}</span>

            {/* Tooltip */}
            <div
              className="absolute left-full ml-2 px-2 py-1 rounded-md bg-popover text-popover-foreground text-xs font-medium shadow-md border border-border/40 invisible group-hover:visible opacity-0 group-hover:opacity-100 pointer-events-none transition-all whitespace-nowrap z-50"
              aria-hidden="true"
            >
              {item.label}
            </div>
          </button>
        );
      })}

      {/* AI button — canvas only */}
      {isCanvas && canvasContext && (
        <button
          onClick={() => canvasContext.setActiveSection('ai' as CanvasSection)}
          className={cn(
            'relative flex flex-col items-center justify-center w-14 h-auto py-1.5 px-1 rounded-xl transition-all duration-200 group gap-0.5 mt-auto',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
            canvasContext.activeSection === 'ai'
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
          )}
          aria-label="AI Assistant"
        >
          <MessageSquare className="h-4 w-4" strokeWidth={canvasContext.activeSection === 'ai' ? 2.5 : 2} />
          <span className="text-[9px] leading-tight font-medium">AI</span>
          <div
            className="absolute left-full ml-2 px-2 py-1 rounded-md bg-popover text-popover-foreground text-xs font-medium shadow-md border border-border/40 invisible group-hover:visible opacity-0 group-hover:opacity-100 pointer-events-none transition-all whitespace-nowrap z-50"
            aria-hidden="true"
          >
            AI Assistant
          </div>
        </button>
      )}
    </nav>
  );
}
