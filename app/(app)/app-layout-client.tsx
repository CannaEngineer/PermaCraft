"use client";

import { useState } from "react";
import { Sidebar } from "@/components/shared/sidebar";
import { Menu, X } from "lucide-react";

export default function AppLayoutClient({
  children,
  userName,
}: {
  children: React.ReactNode;
  userName: string;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="h-screen flex">
      <div
        className={`bg-gray-800 text-white ${
          isSidebarOpen ? "w-64" : "w-0"
        } md:w-64 flex-shrink-0 transition-all duration-300 ease-in-out overflow-hidden md:relative`}
      >
        <Sidebar userName={userName} />
      </div>
      <main className="flex-1 overflow-auto">
        <div className="md:hidden p-4">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
            {isSidebarOpen ? <X /> : <Menu />}
          </button>
        </div>
        {children}
      </main>
    </div>
  );
}