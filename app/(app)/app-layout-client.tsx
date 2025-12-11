"use client";

import { useState } from "react";
import { Sidebar } from "@/components/shared/sidebar";
import { BottomNavBar } from "@/components/shared/bottom-nav-bar";
import { Toaster } from "@/components/ui/toaster";
import AudioPlayer from "@/components/audio/AudioPlayer";

export default function AppLayoutClient({
  children,
  userName,
  isAuthenticated,
}: {
  children: React.ReactNode;
  userName: string | null;
  isAuthenticated: boolean;
}) {
  const [isMusicPlayerOpen, setIsMusicPlayerOpen] = useState(false);

  return (
    <div className="h-screen flex bg-background">
      {/* Desktop Sidebar - hidden on mobile */}
      <aside className="hidden md:block md:w-64 flex-shrink-0 bg-card border-r border-border">
        <Sidebar userName={userName} isAuthenticated={isAuthenticated} />
      </aside>

      {/* Main content area */}
      <main className="flex-1 overflow-auto bg-background pb-16 md:pb-80">
        {children}
      </main>

      {/* Mobile Bottom Navigation - hidden on desktop */}
      <BottomNavBar
        userName={userName}
        isAuthenticated={isAuthenticated}
        onMusicOpen={() => setIsMusicPlayerOpen(true)}
      />

      {/* Audio Player - desktop fixed bottom, mobile drawer */}
      <AudioPlayer
        isMobileOpen={isMusicPlayerOpen}
        onMobileClose={() => setIsMusicPlayerOpen(false)}
      />

      {/* Toast Notifications */}
      <Toaster />
    </div>
  );
}