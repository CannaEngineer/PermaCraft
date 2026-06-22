'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Keyboard } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ShortcutGroup {
  label: string;
  shortcuts: { keys: string[]; description: string }[];
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    label: 'Navigation',
    shortcuts: [
      { keys: ['1'], description: 'Go to Dashboard' },
      { keys: ['2'], description: 'Farm / Map view' },
      { keys: ['3'], description: 'Explore community' },
      { keys: ['4'], description: 'Plants database' },
      { keys: ['5'], description: 'Learn' },
      { keys: ['6'], description: 'AI Assistant' },
    ],
  },
  {
    label: 'Map',
    shortcuts: [
      { keys: ['C'], description: 'Toggle AI chat' },
      { keys: ['S'], description: 'Toggle snap-to-grid' },
      { keys: ['Shift'], description: 'Hold to disable snap while drawing' },
      { keys: ['Esc'], description: 'Close active panel / exit drawing' },
    ],
  },
  {
    label: 'General',
    shortcuts: [
      { keys: ['Ctrl', 'K'], description: 'Search' },
      { keys: ['?'], description: 'Show this help' },
    ],
  },
];

export function KeyboardShortcutsOverlay() {
  const [open, setOpen] = useState(false);

  const toggle = useCallback(() => setOpen((prev: boolean) => !prev), []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === '?' || e.key === '/') {
        e.preventDefault();
        toggle();
      }

      if (e.key === 'Escape' && open) {
        e.preventDefault();
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, toggle]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
            onClick={() => setOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed inset-x-4 top-[10vh] md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 z-[101] bg-background border border-border rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between p-4 border-b border-border/40">
              <div className="flex items-center gap-2">
                <Keyboard className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Keyboard Shortcuts</h2>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 space-y-5">
              {SHORTCUT_GROUPS.map((group) => (
                <div key={group.label}>
                  <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    {group.label}
                  </h3>
                  <div className="space-y-1.5">
                    {group.shortcuts.map((shortcut) => (
                      <div
                        key={shortcut.description}
                        className="flex items-center justify-between py-1"
                      >
                        <span className="text-sm text-foreground">{shortcut.description}</span>
                        <div className="flex items-center gap-1 flex-shrink-0 ml-4">
                          {shortcut.keys.map((key, i) => (
                            <span key={i}>
                              {i > 0 && <span className="text-muted-foreground text-xs mx-0.5">+</span>}
                              <kbd className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded-md bg-muted border border-border/60 text-xs font-medium text-muted-foreground shadow-sm">
                                {key}
                              </kbd>
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="px-4 pb-4">
              <p className="text-[11px] text-muted-foreground text-center">
                Press <kbd className="px-1 py-0.5 bg-muted rounded text-[10px] border border-border/60">?</kbd> to toggle this overlay
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
