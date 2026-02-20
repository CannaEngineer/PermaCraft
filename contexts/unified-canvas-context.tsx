'use client';

import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode, type MutableRefObject } from 'react';
import type { Farm } from '@/lib/db/schema';
import type maplibregl from 'maplibre-gl';

export type CanvasSection = 'home' | 'farm' | 'explore' | 'plants' | 'learn' | 'ai';

export interface PanelStackEntry {
  id: string;
  title: string;
  section: CanvasSection;
}

interface UnifiedCanvasState {
  // Section navigation
  activeSection: CanvasSection;
  setActiveSection: (section: CanvasSection) => void;

  // Farm switching
  farms: Farm[];
  activeFarmId: string | null;
  activeFarm: Farm | null;
  setActiveFarmId: (id: string) => void;

  // Context panel
  contextPanelOpen: boolean;
  setContextPanelOpen: (open: boolean) => void;

  // Panel navigation stack (back button)
  panelStack: PanelStackEntry[];
  pushPanel: (entry: PanelStackEntry) => void;
  popPanel: () => void;
  clearPanelStack: () => void;

  // Map ref for flyTo
  mapRef: MutableRefObject<maplibregl.Map | null>;

  // AI assistant bridge
  captureScreenshot: (() => Promise<string>) | null;
  setCaptureScreenshot: (fn: (() => Promise<string>) | null) => void;
  pendingAIMessage: string | null;
  setPendingAIMessage: (msg: string | null) => void;
}

const UnifiedCanvasContext = createContext<UnifiedCanvasState | undefined>(undefined);

interface UnifiedCanvasProviderProps {
  children: ReactNode;
  initialFarms: Farm[];
}

const validSections: CanvasSection[] = ['home', 'farm', 'explore', 'plants', 'learn', 'ai'];

export function UnifiedCanvasProvider({ children, initialFarms }: UnifiedCanvasProviderProps) {
  const [activeSection, setActiveSectionRaw] = useState<CanvasSection>('home');
  const [farms] = useState<Farm[]>(initialFarms);
  const [activeFarmId, setActiveFarmIdRaw] = useState<string | null>(initialFarms[0]?.id ?? null);
  const [contextPanelOpen, setContextPanelOpen] = useState(true);
  const [panelStack, setPanelStack] = useState<PanelStackEntry[]>([]);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [captureScreenshot, setCaptureScreenshotRaw] = useState<(() => Promise<string>) | null>(null);
  const [pendingAIMessage, setPendingAIMessage] = useState<string | null>(null);

  // Wrap setter to handle function-as-value in useState
  const setCaptureScreenshot = useCallback((fn: (() => Promise<string>) | null) => {
    setCaptureScreenshotRaw(() => fn);
  }, []);

  // Restore URL state after mount (avoids hydration mismatch)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const section = params.get('section') as CanvasSection | null;
    const farmId = params.get('farm');
    if (section && validSections.includes(section)) {
      setActiveSectionRaw(section);
      if (section === 'ai') setContextPanelOpen(false);
    }
    if (farmId && initialFarms.some(f => f.id === farmId)) {
      setActiveFarmIdRaw(farmId);
    }
  }, [initialFarms]);

  const activeFarm = farms.find(f => f.id === activeFarmId) ?? null;

  const setActiveSection = useCallback((section: CanvasSection) => {
    setActiveSectionRaw(section);
    setPanelStack([]);

    // AI section toggles chat, not context panel
    if (section === 'ai') {
      setContextPanelOpen(false);
    } else {
      setContextPanelOpen(true);
    }

    // Update URL without navigation
    const url = new URL(window.location.href);
    url.searchParams.set('section', section);
    if (activeFarmId) url.searchParams.set('farm', activeFarmId);
    window.history.replaceState({}, '', url.toString());
  }, [activeFarmId]);

  const setActiveFarmId = useCallback((id: string) => {
    setActiveFarmIdRaw(id);

    const farm = initialFarms.find(f => f.id === id);
    if (farm && mapRef.current) {
      mapRef.current.flyTo({
        center: [farm.center_lng, farm.center_lat],
        zoom: farm.zoom_level,
        duration: 1500,
      });
    }

    // Update URL
    const url = new URL(window.location.href);
    url.searchParams.set('farm', id);
    window.history.replaceState({}, '', url.toString());
  }, [initialFarms]);

  const pushPanel = useCallback((entry: PanelStackEntry) => {
    setPanelStack(prev => [...prev, entry]);
  }, []);

  const popPanel = useCallback(() => {
    setPanelStack(prev => prev.slice(0, -1));
  }, []);

  const clearPanelStack = useCallback(() => {
    setPanelStack([]);
  }, []);

  const value: UnifiedCanvasState = {
    activeSection,
    setActiveSection,
    farms,
    activeFarmId,
    activeFarm,
    setActiveFarmId,
    contextPanelOpen,
    setContextPanelOpen,
    panelStack,
    pushPanel,
    popPanel,
    clearPanelStack,
    mapRef,
    captureScreenshot,
    setCaptureScreenshot,
    pendingAIMessage,
    setPendingAIMessage,
  };

  return (
    <UnifiedCanvasContext.Provider value={value}>
      {children}
    </UnifiedCanvasContext.Provider>
  );
}

export function useUnifiedCanvas() {
  const context = useContext(UnifiedCanvasContext);
  if (context === undefined) {
    throw new Error('useUnifiedCanvas must be used within UnifiedCanvasProvider');
  }
  return context;
}
