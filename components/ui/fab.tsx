'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FABAction {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  color?: string;
}

interface FABProps {
  /** Primary action when FAB has no expandable menu */
  onAction?: () => void;
  /** Icon for the FAB button */
  icon?: React.ReactNode;
  /** Expandable menu actions (if provided, FAB becomes expandable) */
  actions?: FABAction[];
  /** Custom className for positioning overrides */
  className?: string;
  /** Label for accessibility */
  ariaLabel: string;
}

/**
 * Floating Action Button — Material 3 / Apple HIG pattern.
 *
 * Positioning: bottom-right, above mobile nav bar (88px), standard desktop (8/8).
 * Z-index: 45 — above map controls (z-30), below drawers (z-55) and modals (z-60+).
 *
 * Features:
 * - Speed dial expansion with staggered animation
 * - Labels always visible (mobile-friendly, no hover dependency)
 * - Scrim backdrop on expand for focus
 * - 44px+ touch targets on all interactive elements
 * - Smooth rotation animation on toggle
 */
export function FAB({
  onAction,
  icon = <Plus className="h-6 w-6" />,
  actions,
  className,
  ariaLabel,
}: FABProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleMainClick = () => {
    if (actions && actions.length > 0) {
      setIsExpanded(!isExpanded);
    } else if (onAction) {
      onAction();
    }
  };

  const handleActionClick = (action: FABAction) => {
    action.onClick();
    setIsExpanded(false);
  };

  return (
    <div className={cn(
      "fixed bottom-[88px] right-5 z-[45] md:bottom-8 md:right-8",
      className
    )}>
      {/* Speed Dial Actions */}
      {actions && actions.length > 0 && isExpanded && (
        <>
          {/* Scrim backdrop */}
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-[1px] -z-10 animate-in fade-in duration-150"
            onClick={() => setIsExpanded(false)}
            aria-hidden
          />

          {/* Action items */}
          <div className="absolute bottom-16 right-0 flex flex-col gap-2.5 pb-2 items-end">
            {actions.map((action, index) => (
              <button
                key={action.label}
                onClick={() => handleActionClick(action)}
                className="group flex items-center gap-2.5 transition-all duration-200 ease-out"
                style={{
                  animation: `fabItemIn 200ms ${index * 35}ms ease-out both`,
                }}
              >
                {/* Label — always visible (no hover-only on mobile) */}
                <span className="bg-card/95 backdrop-blur-sm text-card-foreground px-3 py-1.5 rounded-full shadow-lg text-sm font-medium whitespace-nowrap border border-border/30">
                  {action.label}
                </span>
                {/* Icon circle — 44px minimum touch target */}
                <div
                  className={cn(
                    "h-11 w-11 rounded-full shadow-lg flex items-center justify-center flex-shrink-0",
                    "text-white transition-transform hover:scale-110 active:scale-95",
                    action.color || "bg-primary text-primary-foreground"
                  )}
                >
                  {action.icon}
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Main FAB Button */}
      <button
        onClick={handleMainClick}
        className={cn(
          "h-14 w-14 rounded-full shadow-xl flex items-center justify-center",
          "transition-all duration-250 ease-out",
          "bg-primary text-primary-foreground",
          "hover:shadow-2xl hover:brightness-110",
          "active:scale-95",
          "focus:outline-none focus:ring-4 focus:ring-primary/30",
          isExpanded && "rotate-45 shadow-lg"
        )}
        aria-label={ariaLabel}
        aria-expanded={actions && actions.length > 0 ? isExpanded : undefined}
      >
        {isExpanded ? <X className="h-6 w-6" /> : icon}
      </button>
    </div>
  );
}
