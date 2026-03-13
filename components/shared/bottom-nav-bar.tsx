"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Compass,
  Users,
  GraduationCap,
  User,
  Shield,
  LogOut,
  ChevronRight,
  Sparkles,
  ShoppingBag,
} from "lucide-react";
import { isRouteActive } from "@/lib/nav/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CompactMusicController } from "@/components/audio/CompactMusicController";
import { MusicPlayerSheet } from "@/components/audio/MusicPlayerSheet";

const primaryNavItems = [
  { name: "Canvas", href: "/canvas", icon: LayoutDashboard, label: "Home", requiresAuth: true },
  { name: "Discover", href: "/gallery", icon: Compass, label: "Discover", requiresAuth: false },
  { name: "Shop", href: "/shops", icon: ShoppingBag, label: "Shop", requiresAuth: false },
  { name: "Learn", href: "/learn", icon: GraduationCap, label: "Learn", requiresAuth: false },
];

interface BottomNavBarProps {
  userName: string | null;
  isAuthenticated: boolean;
  isAdmin?: boolean;
  userId?: string;
  onMusicOpen?: () => void;
}

/**
 * World-Class Mobile Navigation
 *
 * Design Principles:
 * - iOS/Material Design inspired bottom navigation
 * - 4 primary destinations in bottom bar
 * - Beautiful modal sheet for profile and settings
 * - Clear visual hierarchy and generous spacing
 * - Smooth animations and transitions
 * - Touch-optimized with 48px minimum targets
 * - Progressive disclosure of features
 */
export function BottomNavBar({ userName, isAuthenticated, isAdmin, userId }: BottomNavBarProps) {
  const pathname = usePathname();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isMusicSheetOpen, setIsMusicSheetOpen] = useState(false);

  const handleLogout = async () => {
    await fetch("/api/auth/sign-out", { method: "POST" });
    window.location.href = "/login";
  };

  // Filter navigation based on auth status
  const visibleNav = primaryNavItems.filter(
    (item) => !item.requiresAuth || isAuthenticated
  );

  // Get user initials
  const userInitials = userName
    ? userName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  return (
    <>
      {/* Bottom Navigation Bar - iOS/Material Design Style */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border/50 shadow-2xl safe-area-bottom">
        {/* Navigation Items */}
        <div className="flex items-center justify-around px-2 h-16">
          {visibleNav.map((item) => {
            const isActive = isRouteActive(pathname, item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-xl transition-all duration-200 min-w-[64px] touch-manipulation active:scale-95",
                  isActive && "bg-primary/10"
                )}
              >
                <div className={cn(
                  "relative transition-all duration-200",
                  isActive && "scale-110"
                )}>
                  <Icon
                    className={cn(
                      "h-6 w-6 transition-colors",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )}
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                  {/* Active indicator dot */}
                  {isActive && (
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                  )}
                </div>
                <span
                  className={cn(
                    "text-[11px] font-medium transition-colors leading-none",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* Profile/Menu Button */}
          <button
            onClick={() => setShowProfileMenu(true)}
            className={cn(
              "flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-xl transition-all duration-200 min-w-[64px] touch-manipulation active:scale-95",
              showProfileMenu && "bg-primary/10"
            )}
          >
            <div className={cn(
              "relative transition-all duration-200",
              showProfileMenu && "scale-110"
            )}>
              {isAuthenticated ? (
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-[10px] font-semibold bg-primary text-primary-foreground">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <User
                  className={cn(
                    "h-6 w-6 transition-colors",
                    showProfileMenu ? "text-primary" : "text-muted-foreground"
                  )}
                  strokeWidth={showProfileMenu ? 2.5 : 2}
                />
              )}
              {/* Admin badge */}
              {isAdmin && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full border-2 border-background flex items-center justify-center">
                  <Shield className="w-2 h-2 text-white" strokeWidth={3} />
                </div>
              )}
            </div>
            <span
              className={cn(
                "text-[11px] font-medium transition-colors leading-none",
                showProfileMenu ? "text-primary" : "text-muted-foreground"
              )}
            >
              {isAuthenticated ? "Profile" : "Menu"}
            </span>
          </button>
        </div>
      </nav>

      {/* Profile/Menu Modal Sheet */}
      {showProfileMenu && (
        <>
          {/* Backdrop with blur */}
          <div
            className="md:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] animate-in fade-in duration-200"
            onClick={() => setShowProfileMenu(false)}
          />

          {/* Modal Sheet - iOS/Material Design Style */}
          <div className="md:hidden fixed inset-x-0 bottom-0 z-[70] animate-in slide-in-from-bottom duration-300 safe-area-bottom">
            <div className="bg-background/95 backdrop-blur-xl rounded-t-[28px] shadow-2xl border-t border-border/50 max-h-[85vh] overflow-hidden flex flex-col">
              {/* Drag Handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
              </div>

              {/* Scrollable Content — simplified: removed duplicate nav links, compacted settings */}
              <div className="overflow-y-auto overscroll-contain px-6 pb-6">
                {isAuthenticated ? (
                  <>
                    {/* User Profile Section */}
                    <div className="py-5">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-14 w-14 ring-2 ring-primary/10">
                          <AvatarFallback className="text-xl font-bold bg-gradient-to-br from-primary to-primary/70 text-primary-foreground">
                            {userInitials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-foreground truncate">
                            {userName}
                          </h3>
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

                    {/* Quick Access — only items NOT in the main bottom nav */}
                    <div className="py-3 space-y-1">
                      <Link
                        href="/gallery"
                        onClick={() => setShowProfileMenu(false)}
                        className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-muted/50 transition-colors active:scale-[0.98] touch-manipulation"
                      >
                        <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                          <Compass className="w-5 h-5 text-violet-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">Discover</p>
                          <p className="text-xs text-muted-foreground">Farm tours, stories & shops</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      </Link>

                      <Link
                        href="/shops"
                        onClick={() => setShowProfileMenu(false)}
                        className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-muted/50 transition-colors active:scale-[0.98] touch-manipulation"
                      >
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                          <ShoppingBag className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">Shop</p>
                          <p className="text-xs text-muted-foreground">Browse farm shops</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      </Link>

                      {isAdmin && (
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
                      )}
                    </div>

                    <Separator className="my-1" />

                    {/* Settings row — compact: theme + music side by side */}
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
                    {/* Not Signed In State — simplified */}
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

                    {/* Settings row — compact */}
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

      {/* Music Player Sheet */}
      <MusicPlayerSheet
        open={isMusicSheetOpen}
        onOpenChange={setIsMusicSheetOpen}
      />

      {/* Safe area spacer */}
      <div className="md:hidden h-16" />
    </>
  );
}
