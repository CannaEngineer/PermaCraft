"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { MapIcon, LayoutDashboard, Users, Leaf, GraduationCap, LogOut, Shield, BookOpen, UserCircle, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UniversalSearch } from "@/components/search/universal-search";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { CompactMusicController } from "@/components/audio/CompactMusicController";
import { MusicPlayerSheet } from "@/components/audio/MusicPlayerSheet";

const navigation = [
  { name: "Canvas", href: "/canvas", icon: LayoutDashboard, requiresAuth: true },
  { name: "Community", href: "/gallery", icon: Users, requiresAuth: false },
  { name: "Shop", href: "/shops", icon: Store, requiresAuth: false },
  { name: "Learn", href: "/learn", icon: GraduationCap, requiresAuth: false },
  { name: "Blog", href: "/learn/blog", icon: BookOpen, requiresAuth: false },
  { name: "Plants", href: "/plants", icon: Leaf, requiresAuth: false },
];

export function Sidebar({
  userName,
  isAuthenticated,
  isAdmin,
  userId,
}: {
  userName: string | null;
  isAuthenticated: boolean;
  isAdmin?: boolean;
  userId?: string;
}) {
  const pathname = usePathname();
  const [isMusicSheetOpen, setIsMusicSheetOpen] = React.useState(false);

  const handleLogout = async () => {
    await fetch("/api/auth/sign-out", { method: "POST" });
    window.location.href = "/login";
  };

  // Filter navigation based on auth status
  const visibleNav = navigation.filter(
    (item) => !item.requiresAuth || isAuthenticated
  );

  // Add admin link if user is admin
  const adminNav = isAdmin
    ? [{ name: "Admin", href: "/admin", icon: Shield, requiresAuth: true }]
    : [];

  return (
    <div className="flex flex-col h-full bg-card xp-panel">
      {/* Logo/Brand */}
      <div className="p-6 border-b border-border xp-title-bar">
        <div className="flex items-center space-x-2">
          <MapIcon className="h-8 w-8" />
          <span className="text-xl font-serif font-bold">Permaculture.Studio</span>
        </div>
      </div>

      {/* Global Search */}
      <div className="px-4 pt-4 pb-2">
        <UniversalSearch
          context="global"
          placeholder="Search everything..."
          className="w-full"
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
        {[...visibleNav, ...adminNav].map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "xp-menu-item flex items-center space-x-3 px-4 py-3 rounded-lg text-base font-medium transition-colors min-h-touch",
                isActive
                  ? "active bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Compact Music Controller */}
      <div className="border-t border-border">
        <CompactMusicController onOpenPlayer={() => setIsMusicSheetOpen(true)} />
      </div>

      {/* Music Player Sheet (drawer) */}
      <MusicPlayerSheet
        open={isMusicSheetOpen}
        onOpenChange={setIsMusicSheetOpen}
      />

      {/* Theme Toggle */}
      <div className="px-4 py-3 border-t border-border">
        <ThemeToggle />
      </div>

      {/* User section */}
      <div className="p-4 border-t border-border">
        {isAuthenticated ? (
          <>
            <div className="flex items-center mb-3">
              <span className="text-sm font-medium text-foreground truncate">
                {userName}
              </span>
            </div>
            {userId && (
              <Link
                href={`/profile/${userId}`}
                className={cn(
                  "xp-menu-item flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors mb-2",
                  pathname.startsWith('/profile')
                    ? "active bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <UserCircle className="h-4 w-4 flex-shrink-0" />
                <span>My Profile</span>
              </Link>
            )}
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </>
        ) : (
          <div className="space-y-2">
            <Link href="/login">
              <Button variant="default" className="w-full">
                Log In
              </Button>
            </Link>
            <Link href="/register">
              <Button variant="outline" className="w-full">
                Register
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
