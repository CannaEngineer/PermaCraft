"use client";

import { useImmersiveMapUI } from "@/contexts/immersive-map-ui-context";
import { motion, PanInfo } from "framer-motion";
import { ReactNode, useRef } from "react";
import { useMediaQuery } from "@/hooks/use-media-query";

interface BottomDrawerProps {
  children: ReactNode;
}

export function BottomDrawer({ children }: BottomDrawerProps) {
  const { drawerContent, drawerHeight, closeDrawer, setDrawerHeight } = useImmersiveMapUI();
  const dragConstraintsRef = useRef(null);
  const isMobile = useMediaQuery('(max-width: 767px)');

  if (!drawerContent) return null;

  const heightMap = isMobile
    ? {
        peek: 'calc(100% - 120px)',
        medium: '45vh',
        max: '10vh',
      }
    : {
        peek: 'calc(100% - 100px)',
        medium: '55vh',
        max: '15vh',
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
        className="fixed inset-0 bg-black/10 z-[45]"
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
        className="fixed inset-x-0 bottom-0 md:bottom-0 z-[55] glass-panel-strong rounded-t-3xl border-t border-border/40 shadow-2xl pb-16 md:pb-0 flex flex-col"
        style={{ willChange: 'transform' }}
      >
        {/* Grab Tab - hangs above drawer */}
        <div className="absolute left-1/2 -translate-x-1/2 -top-6 cursor-grab active:cursor-grabbing">
          <div className="w-16 h-8 bg-background/90 backdrop-blur-lg border border-border/50 rounded-t-lg shadow-md flex items-center justify-center">
            <div className="w-8 h-1 bg-muted-foreground/40 rounded-full" />
          </div>
        </div>

        {/* Drag Handle - bigger now */}
        <div className="flex justify-center pt-4 pb-3 cursor-grab active:cursor-grabbing">
          <div className="w-16 h-1.5 bg-muted-foreground/40 rounded-full" />
        </div>

        {/* Content */}
        <div className="px-4 pb-4 overflow-y-auto flex-1">
          {children}
        </div>
      </motion.div>
    </>
  );
}
