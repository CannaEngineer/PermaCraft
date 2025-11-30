"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { MapIcon, LayoutDashboard, ImageIcon, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Gallery", href: "/gallery", icon: ImageIcon },
];

export function Sidebar({ userName }: { userName: string }) {
  const pathname = usePathname();

  const handleLogout = async () => {
    await fetch("/api/auth/sign-out", { method: "POST" });
    window.location.href = "/login";
  };

  return (
    <div className="flex flex-col h-full bg-card border-r border-border">
      <div className="p-6">
        <div className="flex items-center space-x-2">
          <MapIcon className="h-8 w-8 text-primary" />
          <span className="text-xl font-serif font-bold">PermaCraft</span>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-foreground truncate">
            {userName}
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
