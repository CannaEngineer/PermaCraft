"use client";

import { useState } from "react";
import { Sidebar } from "@/components/shared/sidebar";
import { BottomNavBar } from "@/components/shared/bottom-nav-bar";
import { Toaster } from "@/components/ui/toaster";
import AudioPlayer from "@/components/audio/AudioPlayer";
import { OfflineIndicator } from "@/components/shared/offline-indicator";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { OfflineQueueIndicator } from "@/components/shared/offline-queue-indicator";

export default function AppLayoutClient({
  children,
  userName,
  isAuthenticated,
  isAdmin,
}: {
  children: React.ReactNode;
  userName: string | null;
  isAuthenticated: boolean;
  isAdmin?: boolean;
}) {
  const [isMusicPlayerOpen, setIsMusicPlayerOpen] = useState(false);

  return (
    <ErrorBoundary>
      <div className="h-screen flex bg-background">
        {/* Offline Indicator */}
        <OfflineIndicator />

        {/* Desktop Sidebar - hidden on mobile */}
        <aside className="hidden md:block md:w-64 flex-shrink-0 bg-card border-r border-border">
          <Sidebar userName={userName} isAuthenticated={isAuthenticated} isAdmin={isAdmin} />
        </aside>

        {/* Main content area */}
        <main className="flex-1 overflow-auto bg-background pb-16 md:pb-80">
          {children}
        </main>

        {/* Mobile Bottom Navigation - hidden on desktop */}
        <BottomNavBar
          userName={userName}
          isAuthenticated={isAuthenticated}
          isAdmin={isAdmin}
          onMusicOpen={() => setIsMusicPlayerOpen(true)}
        />

        {/* Audio Player - desktop fixed bottom, mobile drawer */}
        <AudioPlayer
          isMobileOpen={isMusicPlayerOpen}
          onMobileClose={() => setIsMusicPlayerOpen(false)}
        />

        {/* Toast Notifications */}
        <Toaster />

        {/* Offline Queue Indicator */}
        <OfflineQueueIndicator />
      </div>
    </ErrorBoundary>
  );
}