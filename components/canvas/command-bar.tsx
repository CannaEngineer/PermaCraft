'use client';

import { useState } from 'react';
import { Save, Loader2, LogOut, UserCircle, Sun, Moon, ChevronDown, ArrowLeft } from 'lucide-react';
import { UniversalSearch } from '@/components/search/universal-search';
import { FarmSwitcher } from './farm-switcher';
import { CartIconButton } from '@/components/shop/cart-icon-button';
import { CartSheet } from '@/components/shop/cart-sheet';
import { useUnifiedCanvas } from '@/contexts/unified-canvas-context';
import { useTheme } from '@/components/theme/ThemeProvider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface CommandBarProps {
  userId?: string;
  userName: string | null;
  saving?: boolean;
  hasUnsavedChanges?: boolean;
  onSave?: () => void;
}

export function CommandBar({ userId, userName, saving, hasUnsavedChanges, onSave }: CommandBarProps) {
  const { activeSection } = useUnifiedCanvas();
  const { mode, toggleMode } = useTheme();
  const [cartOpen, setCartOpen] = useState(false);

  const handleLogout = async () => {
    await fetch('/api/auth/sign-out', { method: 'POST' });
    window.location.href = '/login';
  };

  const userInitials = userName?.trim()
    ? userName.trim().split(/\s+/).map(n => n[0]).filter(Boolean).join('').toUpperCase().slice(0, 2) || 'U'
    : 'U';

  return (
    <header className="flex items-center gap-2 h-12 px-3 glass-panel-strong border-b border-border/40 z-40">
      {/* Back to dashboard + Logo */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <a
          href="/dashboard"
          className="flex items-center justify-center h-8 w-8 rounded-lg hover:bg-accent transition-colors"
          aria-label="Back to dashboard"
          title="Back to dashboard"
        >
          <ArrowLeft className="h-4 w-4 text-muted-foreground" />
        </a>
        <a href="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground text-xs font-bold">P</span>
          </div>
          <span className="hidden lg:block text-sm font-semibold">Permaculture.Studio</span>
        </a>
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
        {/* Farm switcher — only relevant when editing a farm */}
        {activeSection === 'farm' ? (
          <FarmSwitcher />
        ) : (
          <span className="text-sm font-medium capitalize">{activeSection}</span>
        )}

        {/* Save indicator (visible when editing farm) */}
        {activeSection === 'farm' && onSave && (
          saving ? (
            <span className="flex items-center gap-1 text-xs text-muted-foreground min-h-[36px]">
              <Loader2 className="h-3 w-3 animate-spin" />
              Saving...
            </span>
          ) : hasUnsavedChanges ? (
            <button
              onClick={onSave}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors min-h-[36px] bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Save className="h-3.5 w-3.5" />
              Save
            </button>
          ) : (
            <span className="text-xs text-muted-foreground flex items-center gap-1 min-h-[36px]">
              <Save className="h-3 w-3" />
              Saved
            </span>
          )
        )}

        {/* Cart */}
        <CartIconButton onClick={() => setCartOpen(true)} />
        <CartSheet open={cartOpen} onOpenChange={setCartOpen} />

        {/* User menu dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center gap-1.5 h-9 pl-1.5 pr-2 rounded-full bg-accent hover:bg-accent/80 transition-colors"
              aria-label="User menu"
            >
              <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                <span className="text-[10px] font-bold text-primary-foreground">{userInitials}</span>
              </div>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            {/* User info */}
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-0.5">
                <p className="text-sm font-medium">{userName || 'User'}</p>
                <p className="text-xs text-muted-foreground">Permaculture.Studio</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            {/* Profile link */}
            {userId && (
              <DropdownMenuItem asChild>
                <a href={`/profile/${userId}`} className="cursor-pointer">
                  <UserCircle className="h-4 w-4 mr-2" />
                  View Profile
                </a>
              </DropdownMenuItem>
            )}

            {/* Theme toggle */}
            <DropdownMenuItem onClick={toggleMode} className="cursor-pointer">
              {mode === 'dark' ? (
                <Sun className="h-4 w-4 mr-2" />
              ) : (
                <Moon className="h-4 w-4 mr-2" />
              )}
              {mode === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {/* Sign out */}
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive cursor-pointer">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
