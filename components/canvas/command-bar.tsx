'use client';

import { Save, User, Loader2 } from 'lucide-react';
import { UniversalSearch } from '@/components/search/universal-search';
import { FarmSwitcher } from './farm-switcher';
import { useUnifiedCanvas } from '@/contexts/unified-canvas-context';
import { cn } from '@/lib/utils';

interface CommandBarProps {
  userName: string | null;
  saving?: boolean;
  hasUnsavedChanges?: boolean;
  onSave?: () => void;
}

export function CommandBar({ userName, saving, hasUnsavedChanges, onSave }: CommandBarProps) {
  const { activeSection } = useUnifiedCanvas();

  return (
    <header className="flex items-center gap-2 h-12 px-3 glass-panel-strong border-b border-border/40 z-40">
      {/* Logo */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
          <span className="text-primary-foreground text-xs font-bold">P</span>
        </div>
        <span className="hidden lg:block text-sm font-semibold">Permaculture.Studio</span>
      </div>

      {/* Search */}
      <div className="flex-1 max-w-md mx-auto">
        <UniversalSearch
          context="global"
          placeholder="Search... (Ctrl+K)"
          className="w-full"
        />
      </div>

      {/* Right side controls */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <FarmSwitcher />

        {/* Save indicator (visible when editing farm) */}
        {activeSection === 'farm' && onSave && (
          <button
            onClick={onSave}
            disabled={saving || !hasUnsavedChanges}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
              hasUnsavedChanges
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'text-muted-foreground'
            )}
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            {saving ? 'Saving...' : hasUnsavedChanges ? 'Save' : 'Saved'}
          </button>
        )}

        {/* User avatar */}
        <button
          className="flex items-center justify-center h-8 w-8 rounded-full bg-accent hover:bg-accent/80 transition-colors"
          aria-label="User menu"
        >
          <User className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
    </header>
  );
}
