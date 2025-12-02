"use client";

import { useEffect, useState } from "react";

/**
 * SearchShortcutHint - Displays keyboard shortcut for search
 *
 * Shows "⌘ K" on Mac and "Ctrl K" on other platforms
 * Hidden on mobile devices (visible only on md+ breakpoints)
 */
export function SearchShortcutHint() {
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    setIsMac(navigator.platform.toUpperCase().indexOf("MAC") >= 0);
  }, []);

  return (
    <kbd className="hidden md:inline-flex items-center gap-1 px-2 py-1 text-xs font-mono text-muted-foreground border border-border rounded bg-muted">
      <span>{isMac ? "⌘" : "Ctrl"}</span>
      <span>K</span>
    </kbd>
  );
}
