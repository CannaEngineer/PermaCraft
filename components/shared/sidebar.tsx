"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { MapIcon, LayoutDashboard, ImageIcon, Leaf, GraduationCap, LogOut, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UniversalSearch } from "@/components/search/universal-search";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, requiresAuth: true },
  { name: "Gallery", href: "/gallery", icon: ImageIcon, requiresAuth: false },
  { name: "Learn", href: "/learn", icon: GraduationCap, requiresAuth: false },
  { name: "Plants", href: "/plants", icon: Leaf, requiresAuth: false },
];

export function Sidebar({
  userName,
  isAuthenticated,
  isAdmin,
}: {
  userName: string | null;
  isAuthenticated: boolean;
  isAdmin?: boolean;
}) {
  const pathname = usePathname();

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
    <div className="flex flex-col h-full bg-card pb-80 xp-panel">
      {/* Logo/Brand */}
      <div className="p-6 border-b border-border xp-title-bar">
        <div className="flex items-center space-x-2">
          <MapIcon className="h-8 w-8" />
          <span className="text-xl font-serif font-bold">PermaCraft</span>
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
      <nav className="flex-1 px-4 py-4 space-y-2">
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

      {/* Theme Toggle */}
      <div className="px-4 pb-4">
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
