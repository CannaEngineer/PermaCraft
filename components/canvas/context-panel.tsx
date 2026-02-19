'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence, type PanInfo } from 'framer-motion';
import { useUnifiedCanvas } from '@/contexts/unified-canvas-context';

interface ContextPanelProps {
  children: React.ReactNode;
}

export function ContextPanel({ children }: ContextPanelProps) {
  const { contextPanelOpen, setContextPanelOpen, activeSection } = useUnifiedCanvas();

  // Close panel on Escape, toggle with [
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && contextPanelOpen) {
        setContextPanelOpen(false);
      }
      if (e.key === '[' && !e.metaKey && !e.ctrlKey) {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
        setContextPanelOpen(!contextPanelOpen);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [contextPanelOpen, setContextPanelOpen]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    // Swipe down to dismiss on mobile
    if (info.offset.y > 100 || info.velocity.y > 500) {
      setContextPanelOpen(false);
    }
  };

  return (
    <AnimatePresence mode="wait">
      {contextPanelOpen && activeSection !== 'ai' && (
        <>
          {/* Mobile backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setContextPanelOpen(false)}
            className="md:hidden fixed inset-0 bg-black/20 z-30"
          />

          {/* Desktop: right panel */}
          <motion.aside
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30, mass: 0.8 }}
            className="hidden md:flex fixed top-12 right-0 bottom-0 w-[380px] z-[35] flex-col glass-panel-strong border-l border-border/40 overflow-hidden"
          >
            {children}
          </motion.aside>

          {/* Mobile: bottom sheet with drag */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30, mass: 0.8 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className="md:hidden fixed inset-x-0 bottom-14 top-[35%] z-[35] flex flex-col glass-panel-strong rounded-t-2xl border-t border-border/40 overflow-hidden"
          >
            {/* Drag handle */}
            <div className="flex justify-center py-2.5 cursor-grab active:cursor-grabbing touch-none">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>
            {/* Content with scroll isolation */}
            <div
              className="flex-1 overflow-hidden"
              onPointerDown={(e) => e.stopPropagation()}
            >
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
