"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export type DrawerContentType =
  | 'zone' | 'planting' | 'species-picker' | 'zone-quick-label'
  | 'details' | 'comments' | 'water-system' | 'guild-designer'
  | 'phase-manager' | 'export' | 'journal' | 'feature-list'
  | 'tasks' | 'crop-plan' | 'reports';

/**
 * UI modes control which panels are visible at any time.
 * Only 1-2 surfaces show per mode, instead of 4-6 simultaneously.
 *
 * - idle: Default state. Header (collapsed) + FAB visible. Map is interactive.
 * - drawing: Drawing toolbar + minimal "Done" escape. Everything else hidden.
 * - viewing: Details drawer visible. FAB auto-dismissed.
 * - chatting: Full-screen chat overlay. Other panels hidden.
 */
export type UIMode = 'idle' | 'drawing' | 'viewing' | 'chatting';

interface ImmersiveMapUIState {
  // UI Mode (contextual visibility)
  uiMode: UIMode;
  setUIMode: (mode: UIMode) => void;

  // Header
  headerCollapsed: boolean;
  setHeaderCollapsed: (collapsed: boolean) => void;

  // Control Panel
  controlPanelMinimized: boolean;
  controlPanelSection: 'layers' | 'grid' | null;
  setControlPanelSection: (section: 'layers' | 'grid' | null) => void;
  toggleControlPanel: () => void;

  // Drawing Mode
  drawingMode: boolean;
  activeDrawTool: 'polygon' | 'circle' | 'point' | 'edit' | 'delete' | 'line' | null;
  enterDrawingMode: () => void;
  exitDrawingMode: () => void;
  setActiveDrawTool: (tool: 'polygon' | 'circle' | 'point' | 'edit' | 'delete' | 'line' | null) => void;

  // Bottom Drawer
  drawerContent: DrawerContentType | null;
  drawerHeight: 'peek' | 'medium' | 'max';
  openDrawer: (content: DrawerContentType, height?: 'peek' | 'medium' | 'max') => void;
  closeDrawer: () => void;
  setDrawerHeight: (height: 'peek' | 'medium' | 'max') => void;

  // Chat
  chatOpen: boolean;
  setChatOpen: (open: boolean) => void;

  // Map Interactions
  mapInteracted: boolean;
  registerMapInteraction: () => void;
}

const ImmersiveMapUIContext = createContext<ImmersiveMapUIState | undefined>(undefined);

export function ImmersiveMapUIProvider({ children }: { children: ReactNode }) {
  const [uiMode, setUIModeRaw] = useState<UIMode>('idle');
  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  const [controlPanelMinimized, setControlPanelMinimized] = useState(false);
  const [controlPanelSection, setControlPanelSection] = useState<'layers' | 'grid' | null>('layers');
  const [drawingMode, setDrawingMode] = useState(false);
  const [activeDrawTool, setActiveDrawTool] = useState<'polygon' | 'circle' | 'point' | 'edit' | 'delete' | 'line' | null>(null);
  const [drawerContent, setDrawerContent] = useState<DrawerContentType | null>(null);
  const [drawerHeight, setDrawerHeight] = useState<'peek' | 'medium' | 'max'>('medium');
  const [chatOpen, setChatOpenRaw] = useState(false);
  const [mapInteracted, setMapInteracted] = useState(false);

  // Set UI mode with side effects for contextual visibility
  const setUIMode = useCallback((mode: UIMode) => {
    setUIModeRaw(mode);
  }, []);

  const toggleControlPanel = useCallback(() => {
    setControlPanelMinimized(prev => !prev);
  }, []);

  const enterDrawingMode = useCallback(() => {
    setDrawingMode(true);
    setDrawerContent(null); // Close drawer when entering draw mode
    setChatOpenRaw(false); // Close chat when drawing
    setUIModeRaw('drawing');
  }, []);

  const exitDrawingMode = useCallback(() => {
    setDrawingMode(false);
    setActiveDrawTool(null);
    setUIModeRaw('idle');
  }, []);

  const openDrawer = useCallback((
    content: DrawerContentType,
    height: 'peek' | 'medium' | 'max' = 'medium'
  ) => {
    setDrawerContent(content);
    setDrawerHeight(height);
    setUIModeRaw('viewing');
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerContent(null);
    setUIModeRaw('idle');
  }, []);

  // Wrap setChatOpen to sync with uiMode
  const setChatOpen = useCallback((open: boolean) => {
    setChatOpenRaw(open);
    if (open) {
      setDrawerContent(null); // Close drawer when chatting
      setUIModeRaw('chatting');
    } else {
      setUIModeRaw('idle');
    }
  }, []);

  const registerMapInteraction = useCallback(() => {
    if (!mapInteracted) {
      setMapInteracted(true);
      setHeaderCollapsed(true);
    }
  }, [mapInteracted]);

  const value: ImmersiveMapUIState = {
    uiMode,
    setUIMode,
    headerCollapsed,
    setHeaderCollapsed,
    controlPanelMinimized,
    controlPanelSection,
    setControlPanelSection,
    toggleControlPanel,
    drawingMode,
    activeDrawTool,
    enterDrawingMode,
    exitDrawingMode,
    setActiveDrawTool,
    drawerContent,
    drawerHeight,
    openDrawer,
    closeDrawer,
    setDrawerHeight,
    chatOpen,
    setChatOpen,
    mapInteracted,
    registerMapInteraction,
  };

  return (
    <ImmersiveMapUIContext.Provider value={value}>
      {children}
    </ImmersiveMapUIContext.Provider>
  );
}

export function useImmersiveMapUI() {
  const context = useContext(ImmersiveMapUIContext);
  if (context === undefined) {
    throw new Error('useImmersiveMapUI must be used within ImmersiveMapUIProvider');
  }
  return context;
}
