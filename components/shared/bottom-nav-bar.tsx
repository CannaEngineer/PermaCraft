"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { MapIcon, LayoutDashboard, ImageIcon, Leaf, Menu, Music } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Gallery", href: "/gallery", icon: ImageIcon },
  { name: "Plants", href: "/plants", icon: Leaf },
];

interface BottomNavBarProps {
  userName: string;
  onMusicOpen?: () => void;
}

/**
 * Mobile Bottom Navigation Bar
 *
 * Optimized for the "thumb zone" - bottom third of mobile screens
 * where users can easily reach with one hand.
 *
 * Features:
 * - Fixed to bottom of screen
 * - 5 items: Dashboard | Gallery | Plants | Music | Menu
 * - Music opens music player drawer
 * - Menu opens drawer with user info and logout
 * - Active state highlighting
 * - Touch-friendly 44px minimum height
 */
export function BottomNavBar({ userName, onMusicOpen }: BottomNavBarProps) {
  const pathname = usePathname();
  const [showMenu, setShowMenu] = useState(false);

  const handleLogout = async () => {
    await fetch("/api/auth/sign-out", { method: "POST" });
    window.location.href = "/login";
  };

  return (
    <>
      {/* Bottom Navigation Bar - Mobile Only */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[60] bg-card border-t border-border safe-area-bottom">
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors touch-manipulation",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground active:text-primary"
                )}
              >
                <item.icon className={cn(
                  "h-6 w-6 transition-transform",
                  isActive && "scale-110"
                )} />
                <span className={cn(
                  "text-xs font-medium",
                  isActive && "font-semibold"
                )}>
                  {item.name}
                </span>
              </Link>
            );
          })}

          {/* Music Button */}
          <button
            onClick={onMusicOpen}
            className="flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors touch-manipulation text-muted-foreground active:text-primary"
          >
            <Music className="h-6 w-6 transition-transform active:scale-110" />
            <span className="text-xs font-medium">
              Music
            </span>
          </button>

          {/* Menu Button */}
          <button
            onClick={() => setShowMenu(!showMenu)}
            className={cn(
              "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors touch-manipulation",
              showMenu
                ? "text-primary"
                : "text-muted-foreground active:text-primary"
            )}
          >
            <Menu className={cn(
              "h-6 w-6 transition-transform",
              showMenu && "scale-110"
            )} />
            <span className={cn(
              "text-xs font-medium",
              showMenu && "font-semibold"
            )}>
              Menu
            </span>
          </button>
        </div>
      </nav>

      {/* Menu Drawer Overlay */}
      {showMenu && (
        <>
          {/* Backdrop */}
          <div
            className="md:hidden fixed inset-0 bg-black/50 z-50 animate-in fade-in duration-200"
            onClick={() => setShowMenu(false)}
          />

          {/* Drawer */}
          <div className="md:hidden fixed bottom-16 left-0 right-0 z-[55] bg-card border-t border-border rounded-t-xl shadow-2xl animate-in slide-in-from-bottom duration-300 safe-area-bottom">
            <div className="p-6 space-y-4">
              {/* User Info */}
              <div className="flex items-center space-x-3 pb-4 border-b border-border">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-lg font-semibold text-primary">
                    {userName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {userName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Signed in
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start h-12"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4 mr-3" />
                  Sign Out
                </Button>

                <Button
                  variant="ghost"
                  className="w-full justify-start h-12"
                  onClick={() => setShowMenu(false)}
                >
                  Close Menu
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Spacer for fixed bottom nav - prevents content from being hidden */}
      <div className="md:hidden h-16" />
    </>
  );
}
