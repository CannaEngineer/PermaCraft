"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface ImmersiveMapUIState {
  // Header
  headerCollapsed: boolean;
  setHeaderCollapsed: (collapsed: boolean) => void;

  // Control Panel
  controlPanelMinimized: boolean;
  controlPanelSection: 'layers' | 'grid' | 'options' | 'help' | null;
  setControlPanelSection: (section: 'layers' | 'grid' | 'options' | 'help' | null) => void;
  toggleControlPanel: () => void;

  // Drawing Mode
  drawingMode: boolean;
  activeDrawTool: 'polygon' | 'circle' | 'point' | 'edit' | 'delete' | null;
  enterDrawingMode: () => void;
  exitDrawingMode: () => void;
  setActiveDrawTool: (tool: 'polygon' | 'circle' | 'point' | 'edit' | 'delete' | null) => void;

  // Bottom Drawer
  drawerContent: 'zone' | 'planting' | 'species-picker' | 'zone-quick-label' | null;
  drawerHeight: 'peek' | 'medium' | 'max';
  openDrawer: (content: 'zone' | 'planting' | 'species-picker' | 'zone-quick-label', height?: 'peek' | 'medium' | 'max') => void;
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
  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  const [controlPanelMinimized, setControlPanelMinimized] = useState(false);
  const [controlPanelSection, setControlPanelSection] = useState<'layers' | 'grid' | 'options' | 'help' | null>('layers');
  const [drawingMode, setDrawingMode] = useState(false);
  const [activeDrawTool, setActiveDrawTool] = useState<'polygon' | 'circle' | 'point' | 'edit' | 'delete' | null>(null);
  const [drawerContent, setDrawerContent] = useState<'zone' | 'planting' | 'species-picker' | 'zone-quick-label' | null>(null);
  const [drawerHeight, setDrawerHeight] = useState<'peek' | 'medium' | 'max'>('medium');
  const [chatOpen, setChatOpen] = useState(false);
  const [mapInteracted, setMapInteracted] = useState(false);

  const toggleControlPanel = () => {
    setControlPanelMinimized(!controlPanelMinimized);
  };

  const enterDrawingMode = () => {
    setDrawingMode(true);
    setDrawerContent(null); // Close drawer when entering draw mode
  };

  const exitDrawingMode = () => {
    setDrawingMode(false);
    setActiveDrawTool(null);
  };

  const openDrawer = (
    content: 'zone' | 'planting' | 'species-picker' | 'zone-quick-label',
    height: 'peek' | 'medium' | 'max' = 'medium'
  ) => {
    setDrawerContent(content);
    setDrawerHeight(height);
  };

  const closeDrawer = () => {
    setDrawerContent(null);
  };

  const registerMapInteraction = () => {
    if (!mapInteracted) {
      setMapInteracted(true);
      setHeaderCollapsed(true);
    }
  };

  const value: ImmersiveMapUIState = {
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
