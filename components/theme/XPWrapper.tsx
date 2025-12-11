'use client';

import { useTheme } from './ThemeProvider';
import { useEffect } from 'react';

/**
 * XPWrapper - Adds Windows XP specific body classes
 * This allows XP-specific CSS to be applied when the theme is active
 */
export function XPWrapper({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();

  useEffect(() => {
    if (theme === 'windows-xp') {
      document.body.classList.add('xp-theme');
    } else {
      document.body.classList.remove('xp-theme');
    }
  }, [theme]);

  return <>{children}</>;
}
