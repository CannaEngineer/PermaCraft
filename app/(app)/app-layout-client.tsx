"use client";

import { useState } from "react";
import { Sidebar } from "@/components/shared/sidebar";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppLayoutClient({
  children,
  userName,
}: {
  children: React.ReactNode;
  userName: string;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="h-screen flex bg-background">
      {/* Sidebar - hidden on mobile unless open */}
      <aside
        className={`bg-card border-r border-border ${
          isSidebarOpen ? "w-64" : "w-0"
        } md:w-64 flex-shrink-0 transition-all duration-300 ease-in-out overflow-hidden md:block`}
      >
        <Sidebar userName={userName} />
      </aside>

      {/* Main content area */}
      <main className="flex-1 overflow-auto bg-background">
        {/* Mobile menu button */}
        <div className="md:hidden p-4 border-b border-border bg-card">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            aria-label="Toggle menu"
          >
            {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>
        {children}
      </main>
    </div>
  );
}