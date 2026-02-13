'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'modern' | 'windows-xp' | 'neon' | 'true-dark';
type Mode = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  mode: Mode;
  setTheme: (theme: Theme) => void;
  setMode: (mode: Mode) => void;
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('modern');
  const [mode, setModeState] = useState<Mode>('light');

  useEffect(() => {
    // Load theme and mode from localStorage
    const savedTheme = localStorage.getItem('app-theme') as Theme;
    const savedMode = localStorage.getItem('app-mode') as Mode;

    if (savedTheme && ['modern', 'windows-xp', 'neon', 'true-dark'].includes(savedTheme)) {
      setThemeState(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    }

    if (savedMode && (savedMode === 'light' || savedMode === 'dark')) {
      setModeState(savedMode);
      document.documentElement.classList.toggle('dark', savedMode === 'dark');
    }
  }, []);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('app-theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const setMode = (newMode: Mode) => {
    setModeState(newMode);
    localStorage.setItem('app-mode', newMode);
    document.documentElement.classList.toggle('dark', newMode === 'dark');
  };

  const toggleMode = () => {
    const newMode = mode === 'light' ? 'dark' : 'light';
    setMode(newMode);
  };

  return (
    <ThemeContext.Provider value={{ theme, mode, setTheme, setMode, toggleMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
