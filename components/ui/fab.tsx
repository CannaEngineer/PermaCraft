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
  /** Custom className for positioning */
  className?: string;
  /** Label for accessibility */
  ariaLabel: string;
}

/**
 * Context-Aware Floating Action Button
 *
 * Positioned in the bottom-right corner for maximum mobile accessibility.
 * Can be used as:
 * 1. Simple FAB with single action
 * 2. Expandable FAB with multiple actions (speed dial)
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
    <div className={cn("fixed bottom-[88px] right-6 z-40 md:bottom-24 md:right-8", className)}>
      {/* Expanded Action Menu (Speed Dial) */}
      {actions && actions.length > 0 && isExpanded && (
        <div className="absolute bottom-[72px] right-0 flex flex-col gap-3 mb-4">
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={() => handleActionClick(action)}
              className="group flex items-center gap-3 transition-all duration-200 ease-out animate-in slide-in-from-bottom-4"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Action Label */}
              <span className="bg-card text-card-foreground px-3 py-2 rounded-lg shadow-lg text-sm font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                {action.label}
              </span>
              {/* Action Icon Button */}
              <div
                className={cn(
                  "h-12 w-12 rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-110 active:scale-95",
                  action.color || "bg-primary text-primary-foreground"
                )}
              >
                {action.icon}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Main FAB Button */}
      <button
        onClick={handleMainClick}
        className={cn(
          "h-14 w-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-200",
          "bg-primary text-primary-foreground",
          "hover:scale-110 active:scale-95",
          "focus:outline-none focus:ring-4 focus:ring-primary/30",
          isExpanded && "rotate-45"
        )}
        aria-label={ariaLabel}
      >
        {isExpanded ? <X className="h-6 w-6" /> : icon}
      </button>

      {/* Backdrop for Expandable Menu */}
      {isExpanded && (
        <div
          className="fixed inset-0 bg-black/20 -z-10"
          onClick={() => setIsExpanded(false)}
        />
      )}
    </div>
  );
}
