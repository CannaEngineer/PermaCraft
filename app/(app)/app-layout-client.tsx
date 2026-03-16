"use client";

import { Sidebar } from "@/components/shared/sidebar";
import { BottomNavBar } from "@/components/shared/bottom-nav-bar";
import { Toaster } from "@/components/ui/toaster";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { PublicTopBar } from "@/components/shared/public-top-bar";
import { OfflineSyncProvider } from "@/contexts/offline-sync-context";
import { SyncStatusBar } from "@/components/shared/sync-status-bar";
import { ConflictResolver } from "@/components/shared/conflict-resolver";

export default function AppLayoutClient({
  children,
  userName,
  isAuthenticated,
  isAdmin,
  userId,
}: {
  children: React.ReactNode;
  userName: string | null;
  isAuthenticated: boolean;
  isAdmin?: boolean;
  userId?: string;
}) {
  if (!isAuthenticated) {
    return (
      <ErrorBoundary>
        <OfflineSyncProvider>
          <div className="min-h-screen bg-background">
            <SyncStatusBar position="top" />
            <PublicTopBar />
            <main className="pt-14">{children}</main>
            <Toaster />
          </div>
        </OfflineSyncProvider>
      </ErrorBoundary>
    );
  }


  return (
    <ErrorBoundary>
      <OfflineSyncProvider>
        <div className="h-screen flex bg-background">
          {/* Sync Status Bar */}
          <SyncStatusBar position="top" />

          {/* Desktop Sidebar */}
          <aside className="hidden md:block md:w-64 flex-shrink-0 bg-card border-r border-border">
            <Sidebar userName={userName} isAuthenticated={isAuthenticated} isAdmin={isAdmin} userId={userId} />
          </aside>

          {/* Main content area */}
          <main className="flex-1 overflow-auto bg-background pb-16 md:pb-0">
            {children}
          </main>

          {/* Mobile Bottom Navigation - hidden on desktop */}
          <BottomNavBar
            userName={userName}
            isAuthenticated={isAuthenticated}
            isAdmin={isAdmin}
            userId={userId}
          />

          {/* Toast Notifications */}
          <Toaster />

          {/* Conflict Resolution Dialog */}
          <ConflictResolver />
        </div>
      </OfflineSyncProvider>
    </ErrorBoundary>
  );
}