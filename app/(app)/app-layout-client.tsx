"use client";

import { Sidebar } from "@/components/shared/sidebar";
import { BottomNavBar } from "@/components/shared/bottom-nav-bar";
import { Toaster } from "@/components/ui/toaster";

export default function AppLayoutClient({
  children,
  userName,
}: {
  children: React.ReactNode;
  userName: string;
}) {
  return (
    <div className="h-screen flex bg-background">
      {/* Desktop Sidebar - hidden on mobile */}
      <aside className="hidden md:block md:w-64 flex-shrink-0 bg-card border-r border-border">
        <Sidebar userName={userName} />
      </aside>

      {/* Main content area */}
      <main className="flex-1 overflow-auto bg-background">
        {children}
      </main>

      {/* Mobile Bottom Navigation - hidden on desktop */}
      <BottomNavBar userName={userName} />

      {/* Toast Notifications */}
      <Toaster />
    </div>
  );
}