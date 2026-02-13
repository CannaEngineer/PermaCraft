"use client";

import { useImmersiveMapUI } from "@/contexts/immersive-map-ui-context";
import { motion, PanInfo } from "framer-motion";
import { ReactNode, useRef } from "react";

interface BottomDrawerProps {
  children: ReactNode;
}

export function BottomDrawer({ children }: BottomDrawerProps) {
  const { drawerContent, drawerHeight, closeDrawer, setDrawerHeight } = useImmersiveMapUI();
  const dragConstraintsRef = useRef(null);

  if (!drawerContent) return null;

  const heightMap = {
    peek: 'calc(100% - 80px)',
    medium: '60vh',
    max: '20vh',
  };

  const handleDragEnd = (_event: any, info: PanInfo) => {
    const velocity = info.velocity.y;
    const offset = info.offset.y;

    // Fast downward swipe = close
    if (velocity > 500) {
      closeDrawer();
      return;
    }

    // Snap to height based on drag distance
    if (offset > 100) {
      // Dragged down
      if (drawerHeight === 'max') setDrawerHeight('medium');
      else if (drawerHeight === 'medium') setDrawerHeight('peek');
      else closeDrawer();
    } else if (offset < -100) {
      // Dragged up
      if (drawerHeight === 'peek') setDrawerHeight('medium');
      else if (drawerHeight === 'medium') setDrawerHeight('max');
    }
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={closeDrawer}
        className="fixed inset-0 bg-black/10 z-34"
      />

      {/* Drawer */}
      <motion.div
        ref={dragConstraintsRef}
        initial={{ y: '100%' }}
        animate={{ y: heightMap[drawerHeight] }}
        exit={{ y: '100%' }}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 30,
          mass: 0.8,
        }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        className="fixed inset-x-0 bottom-0 z-35 glass-panel-strong rounded-t-3xl border-t border-border/40 shadow-2xl"
        style={{ willChange: 'transform' }}
      >
        {/* Drag Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full" />
        </div>

        {/* Content */}
        <div className="px-4 pb-4 overflow-y-auto max-h-[calc(80vh-48px)]">
          {children}
        </div>
      </motion.div>
    </>
  );
}
