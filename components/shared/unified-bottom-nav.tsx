'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { getNavItems, isRouteActive } from '@/lib/nav/navigation';
import {
  User,
  Shield,
  LogOut,
  ChevronRight,
  Sparkles,
  MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { CompactMusicController } from '@/components/audio/CompactMusicController';
import { MusicPlayerSheet } from '@/components/audio/MusicPlayerSheet';
import type { CanvasSection } from '@/contexts/unified-canvas-context';

interface UnifiedBottomNavProps {
  userName: string | null;
  isAuthenticated: boolean;
  isAdmin?: boolean;
  userId?: string;
  /** When inside the canvas, provide section state for section-based navigation */
  canvasContext?: {
    activeSection: string;
    setActiveSection: (section: CanvasSection) => void;
  };
}

/**
 * Unified mobile bottom navigation — single component for all pages.
 *
 * 5 slots: 4 nav items + profile/menu button.
 * Context-aware: uses section switching on canvas, route navigation elsewhere.
 */
export function UnifiedBottomNav({
  userName,
  isAuthenticated,
  isAdmin,
  userId,
  canvasContext,
}: UnifiedBottomNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isMusicSheetOpen, setIsMusicSheetOpen] = useState(false);

  const navItems = getNavItems(pathname);
  const isCanvas = !!canvasContext;

  const handleLogout = async () => {
    await fetch('/api/auth/sign-out', { method: 'POST' });
    window.location.href = '/login';
  };

  const handleClick = (item: typeof navItems[0]) => {
    if (isCanvas && item.canvasSection && canvasContext) {
      canvasContext.setActiveSection(item.canvasSection as CanvasSection);
      return;
    }
    router.push(item.href);
  };

  const isActive = (item: typeof navItems[0]) => {
    if (isCanvas && item.canvasSection && canvasContext) {
      return canvasContext.activeSection === item.canvasSection;
    }
    if (isCanvas && item.id === 'dashboard') return false;
    if (!isCanvas && item.id === 'farm') return false;
    return isRouteActive(pathname, item.href);
  };

  const userInitials = userName
    ? userName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border/50 shadow-2xl safe-area-bottom">
        <div className="flex items-center justify-around px-2 h-16">
          {navItems.map((item) => {
            const active = isActive(item);
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => handleClick(item)}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all duration-200 min-w-[56px] touch-manipulation active:scale-95',
                  active && 'bg-primary/10'
                )}
                aria-label={item.label}
                aria-current={active ? 'page' : undefined}
              >
                <div className={cn('relative transition-all duration-200', active && 'scale-110')}>
                  <Icon
                    className={cn('h-5 w-5 transition-colors', active ? 'text-primary' : 'text-muted-foreground')}
                    strokeWidth={active ? 2.5 : 2}
                  />
                  {active && (
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                  )}
                </div>
                <span className={cn('text-[10px] font-medium transition-colors leading-none', active ? 'text-primary' : 'text-muted-foreground')}>
                  {item.label}
                </span>
              </button>
            );
          })}

          {/* AI button — canvas only */}
          {isCanvas && canvasContext && (
            <button
              onClick={() => canvasContext.setActiveSection('ai' as CanvasSection)}
              className={cn(
                'flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all duration-200 min-w-[56px] touch-manipulation active:scale-95',
                canvasContext.activeSection === 'ai' && 'bg-primary/10'
              )}
              aria-label="AI Assistant"
            >
              <div className={cn('relative transition-all duration-200', canvasContext.activeSection === 'ai' && 'scale-110')}>
                <MessageSquare
                  className={cn('h-5 w-5 transition-colors', canvasContext.activeSection === 'ai' ? 'text-primary' : 'text-muted-foreground')}
                  strokeWidth={canvasContext.activeSection === 'ai' ? 2.5 : 2}
                />
                {canvasContext.activeSection === 'ai' && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                )}
              </div>
              <span className={cn('text-[10px] font-medium leading-none', canvasContext.activeSection === 'ai' ? 'text-primary' : 'text-muted-foreground')}>
                AI
              </span>
            </button>
          )}

          {/* Profile/Menu Button */}
          <button
            onClick={() => setShowProfileMenu(true)}
            className={cn(
              'flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all duration-200 min-w-[56px] touch-manipulation active:scale-95',
              showProfileMenu && 'bg-primary/10'
            )}
          >
            <div className={cn('relative transition-all duration-200', showProfileMenu && 'scale-110')}>
              {isAuthenticated ? (
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-[10px] font-semibold bg-primary text-primary-foreground">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <User
                  className={cn('h-5 w-5 transition-colors', showProfileMenu ? 'text-primary' : 'text-muted-foreground')}
                  strokeWidth={showProfileMenu ? 2.5 : 2}
                />
              )}
              {isAdmin && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full border-2 border-background flex items-center justify-center">
                  <Shield className="w-2 h-2 text-white" strokeWidth={3} />
                </div>
              )}
            </div>
            <span className={cn('text-[10px] font-medium transition-colors leading-none', showProfileMenu ? 'text-primary' : 'text-muted-foreground')}>
              {isAuthenticated ? 'Me' : 'Menu'}
            </span>
          </button>
        </div>
      </nav>

      {/* Profile/Menu Modal Sheet */}
      {showProfileMenu && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] animate-in fade-in duration-200"
            onClick={() => setShowProfileMenu(false)}
          />
          <div className="md:hidden fixed inset-x-0 bottom-0 z-[70] animate-in slide-in-from-bottom duration-300 safe-area-bottom">
            <div className="bg-background/95 backdrop-blur-xl rounded-t-[28px] shadow-2xl border-t border-border/50 max-h-[85vh] overflow-hidden flex flex-col">
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
              </div>
              <div className="overflow-y-auto overscroll-contain px-6 pb-6">
                {isAuthenticated ? (
                  <>
                    {/* User Profile */}
                    <div className="py-5">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-14 w-14 ring-2 ring-primary/10">
                          <AvatarFallback className="text-xl font-bold bg-gradient-to-br from-primary to-primary/70 text-primary-foreground">
                            {userInitials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-foreground truncate">{userName}</h3>
                          {userId && (
                            <Link
                              href={`/profile/${userId}`}
                              onClick={() => setShowProfileMenu(false)}
                              className="text-sm text-primary hover:underline"
                            >
                              View Profile
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>

                    <Separator className="my-1" />

                    {/* Admin link — only extra item, no duplicates of main nav */}
                    {isAdmin && (
                      <div className="py-3 space-y-1">
                        <Link
                          href="/admin"
                          onClick={() => setShowProfileMenu(false)}
                          className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-amber-500/10 transition-colors active:scale-[0.98] touch-manipulation border border-amber-500/20"
                        >
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/20 flex items-center justify-center">
                            <Shield className="w-5 h-5 text-amber-600" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-sm text-amber-900 dark:text-amber-100">Admin Dashboard</p>
                          </div>
                          <ChevronRight className="w-5 h-5 text-amber-600" />
                        </Link>
                        <Separator className="my-1" />
                      </div>
                    )}

                    {/* Settings: theme + music */}
                    <div className="py-3 flex items-center gap-3 px-3">
                      <div className="flex-1">
                        <ThemeToggle />
                      </div>
                      <CompactMusicController
                        onOpenPlayer={() => setIsMusicSheetOpen(true)}
                        variant="mobile"
                      />
                    </div>

                    <Separator className="my-1" />

                    {/* Sign Out */}
                    <div className="py-3">
                      <Button
                        variant="ghost"
                        className="w-full justify-start h-11 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={handleLogout}
                      >
                        <LogOut className="h-5 w-5 mr-3" />
                        <span className="font-medium">Sign Out</span>
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="py-6">
                      <div className="text-center space-y-2 mb-6">
                        <div className="w-14 h-14 mx-auto rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mb-3">
                          <Sparkles className="w-7 h-7 text-primary" />
                        </div>
                        <h3 className="text-xl font-bold">Welcome!</h3>
                        <p className="text-sm text-muted-foreground max-w-[280px] mx-auto">
                          Sign in to create farms, track progress, and join the community
                        </p>
                      </div>
                      <div className="space-y-3">
                        <Link href="/login" onClick={() => setShowProfileMenu(false)}>
                          <Button className="w-full h-12 text-base font-semibold rounded-xl">
                            Sign In
                          </Button>
                        </Link>
                      </div>
                    </div>
                    <Separator className="my-1" />
                    <div className="py-3 flex items-center gap-3 px-3">
                      <div className="flex-1">
                        <ThemeToggle />
                      </div>
                      <CompactMusicController
                        onOpenPlayer={() => setIsMusicSheetOpen(true)}
                        variant="mobile"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      <MusicPlayerSheet open={isMusicSheetOpen} onOpenChange={setIsMusicSheetOpen} />

      {/* Safe area spacer */}
      <div className="md:hidden h-16" />
    </>
  );
}
