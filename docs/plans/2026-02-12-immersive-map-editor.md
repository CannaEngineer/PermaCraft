# Immersive Map Editor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild the farm detail page as a full-screen, immersive map experience with glassmorphism UI, auto-collapsing header, and mobile-optimized touch interactions.

**Architecture:** New `ImmersiveMapEditor` component completely separate from `FarmEditorClient`. All UI elements are position-absolute overlays on a full-viewport map. Centralized state via `ImmersiveMapUIContext`. Feature-flagged for gradual rollout.

**Tech Stack:** Next.js 14, React 18, TypeScript, Tailwind CSS, Framer Motion, MapLibre GL, shadcn/ui

**Design Reference:** See `docs/plans/2026-02-12-immersive-map-design.md` for full specifications.

---

## Task 1: Install Dependencies & Add CSS Variables

**Files:**
- Modify: `package.json`
- Modify: `app/globals.css`
- Create: `tailwind.config.ts` (if changes needed)

**Step 1: Install Framer Motion**

```bash
npm install framer-motion@^11.0.0
```

Expected: Package installed, `package.json` updated

**Step 2: Add glassmorphism CSS variables**

Open `app/globals.css` and add after existing shadcn variables in `:root` and `.dark`:

```css
@layer base {
  :root {
    /* Existing shadcn variables... */

    /* Glassmorphism overlays - Light mode */
    --glass-background: hsl(var(--background) / 0.7);
    --glass-background-strong: hsl(var(--background) / 0.9);
    --glass-border: hsl(var(--border) / 0.3);
    --glass-shadow: hsl(var(--foreground) / 0.1);

    /* Backdrop blur */
    --backdrop-light: hsl(0 0% 0% / 0.2);
    --backdrop-strong: hsl(0 0% 0% / 0.4);
  }

  .dark {
    /* Glassmorphism overlays - Dark mode */
    --glass-background: hsl(var(--background) / 0.6);
    --glass-background-strong: hsl(var(--background) / 0.85);
    --glass-border: hsl(var(--border) / 0.4);
    --glass-shadow: hsl(0 0% 0% / 0.3);

    --backdrop-light: hsl(0 0% 0% / 0.3);
    --backdrop-strong: hsl(0 0% 0% / 0.5);
  }
}
```

**Step 3: Add glassmorphism utility classes**

Add to `app/globals.css` after the `@layer base` section:

```css
@layer components {
  .glass-panel {
    @apply bg-background/70 backdrop-blur-xl border border-border/30 shadow-glass;
  }

  .glass-panel-strong {
    @apply bg-background/90 backdrop-blur-2xl border border-border/40 shadow-glass;
  }

  .glass-backdrop {
    @apply bg-black/20 dark:bg-black/40 backdrop-blur-sm;
  }
}
```

**Step 4: Add reduced transparency support**

Add media query to `app/globals.css`:

```css
@media (prefers-reduced-transparency: reduce) {
  .glass-panel,
  .glass-panel-strong {
    @apply bg-background backdrop-blur-none;
  }

  .glass-backdrop {
    @apply bg-black/40 dark:bg-black/60 backdrop-blur-none;
  }
}
```

**Step 5: Add timing/easing CSS variables**

Add to `:root` in `app/globals.css`:

```css
  :root {
    /* ... existing variables ... */

    /* Animation timing */
    --duration-fast: 150ms;
    --duration-normal: 250ms;
    --duration-slow: 400ms;

    /* Easing curves */
    --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
    --ease-in-out-back: cubic-bezier(0.68, -0.55, 0.265, 1.55);
    --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  }
```

**Step 6: Extend Tailwind config for glass effects**

Open `tailwind.config.ts` and add to `theme.extend`:

```typescript
backgroundImage: {
  'glass': 'linear-gradient(135deg, var(--glass-background) 0%, var(--glass-background-strong) 100%)',
},
boxShadow: {
  'glass': '0 8px 32px 0 var(--glass-shadow)',
},
```

**Step 7: Commit CSS setup**

```bash
git add app/globals.css tailwind.config.ts package.json package-lock.json
git commit -m "feat: add glassmorphism CSS variables and Framer Motion

- Add glass-panel, glass-panel-strong, glass-backdrop utility classes
- Add animation timing and easing CSS variables
- Install Framer Motion for advanced animations
- Add reduced-transparency media query support
- Extend Tailwind config with glass shadow and background

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Create ImmersiveMapUIContext

**Files:**
- Create: `contexts/immersive-map-ui-context.tsx`

**Step 1: Create context directory**

```bash
mkdir -p contexts
```

**Step 2: Create ImmersiveMapUIContext file**

Create `contexts/immersive-map-ui-context.tsx`:

```typescript
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
```

**Step 3: Commit context**

```bash
git add contexts/immersive-map-ui-context.tsx
git commit -m "feat: create ImmersiveMapUIContext for centralized UI state

- Manages header, control panel, drawing toolbar, drawer, chat visibility
- Provides auto-collapse logic via registerMapInteraction
- Single source of truth for all panel state

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Create CollapsibleHeader Component

**Files:**
- Create: `components/immersive-map/collapsible-header.tsx`

**Step 1: Create component directory**

```bash
mkdir -p components/immersive-map
```

**Step 2: Create CollapsibleHeader component**

Create `components/immersive-map/collapsible-header.tsx`:

```typescript
"use client";

import { useImmersiveMapUI } from "@/contexts/immersive-map-ui-context";
import { Button } from "@/components/ui/button";
import { SaveIcon, MessageSquare, Target, ChevronDown, ChevronUp } from "lucide-react";
import type { Farm } from "@/lib/db/schema";
import { motion, AnimatePresence } from "framer-motion";
import { FarmSettingsButton } from "@/components/farm/farm-settings-button";

interface CollapsibleHeaderProps {
  farm: Farm;
  hasUnsavedChanges: boolean;
  saving: boolean;
  goalsCount: number;
  isPublic: boolean;
  onSave: () => void;
  onOpenChat: () => void;
  onOpenGoals: () => void;
  onDeleteClick: () => void;
}

export function CollapsibleHeader({
  farm,
  hasUnsavedChanges,
  saving,
  goalsCount,
  isPublic,
  onSave,
  onOpenChat,
  onOpenGoals,
  onDeleteClick,
}: CollapsibleHeaderProps) {
  const { headerCollapsed, setHeaderCollapsed } = useImmersiveMapUI();

  return (
    <motion.header
      initial={false}
      animate={{
        height: headerCollapsed ? 48 : 120,
        paddingTop: headerCollapsed ? 8 : 16,
        paddingBottom: headerCollapsed ? 8 : 12,
      }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border/50"
      style={{ willChange: 'height' }}
    >
      <div className="px-4 sm:px-6 h-full flex items-center justify-between gap-4">
        {/* Left: Farm Identity */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <motion.h1
              animate={{
                fontSize: headerCollapsed ? '1.125rem' : '1.875rem',
              }}
              transition={{ duration: 0.25 }}
              className="font-serif font-bold text-foreground truncate"
            >
              {farm.name}
            </motion.h1>

            {/* Status Badges (desktop only) */}
            <AnimatePresence>
              {!headerCollapsed && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.15 }}
                  className="hidden sm:flex items-center gap-2"
                >
                  {hasUnsavedChanges && !saving && (
                    <span className="text-xs bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-800 font-medium">
                      Unsaved
                    </span>
                  )}
                  {saving && (
                    <span className="text-xs bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200 px-2.5 py-1 rounded-full border border-blue-200 dark:border-blue-800 font-medium animate-pulse">
                      Saving...
                    </span>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Toggle button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setHeaderCollapsed(!headerCollapsed)}
              className="flex-shrink-0 h-8 w-8"
            >
              {headerCollapsed ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Description (only when expanded) */}
          <AnimatePresence>
            {!headerCollapsed && farm.description && (
              <motion.p
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="text-sm text-muted-foreground line-clamp-1 mt-1"
              >
                {farm.description}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Expanded actions */}
          <AnimatePresence>
            {!headerCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                className="hidden md:flex items-center gap-2"
              >
                <Button
                  onClick={onSave}
                  disabled={saving}
                  variant={hasUnsavedChanges ? "default" : "outline"}
                  size="sm"
                >
                  <SaveIcon className="h-4 w-4 mr-2" />
                  {saving ? "Saving..." : hasUnsavedChanges ? "Save Now" : "Saved"}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={onOpenGoals}
                >
                  <Target className="h-4 w-4 mr-2" />
                  Goals
                  {goalsCount > 0 && (
                    <span className="ml-2 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {goalsCount}
                    </span>
                  )}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Always visible: AI Chat */}
          <Button
            variant="default"
            size={headerCollapsed ? "icon" : "default"}
            onClick={onOpenChat}
          >
            <MessageSquare className={headerCollapsed ? "h-4 w-4" : "h-4 w-4 sm:mr-2"} />
            {!headerCollapsed && <span className="hidden sm:inline">AI Assistant</span>}
          </Button>

          {/* Settings */}
          <FarmSettingsButton
            farmId={farm.id}
            initialIsPublic={isPublic}
            onDeleteClick={onDeleteClick}
          />
        </div>
      </div>
    </motion.header>
  );
}
```

**Step 3: Commit header component**

```bash
git add components/immersive-map/collapsible-header.tsx
git commit -m "feat: create CollapsibleHeader component

- Auto-collapses from 120px to 48px height
- Smooth Framer Motion animations
- Shows farm name, description, status badges
- Actions: Save, Goals, AI Chat, Settings
- Mobile-optimized with icon-only collapsed state

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Create MapControlPanel Component

**Files:**
- Create: `components/immersive-map/map-control-panel.tsx`

**Step 1: Create MapControlPanel component**

Create `components/immersive-map/map-control-panel.tsx`:

```typescript
"use client";

import { useImmersiveMapUI } from "@/contexts/immersive-map-ui-context";
import { Button } from "@/components/ui/button";
import { Layers, Grid3x3, Settings, HelpCircle, ChevronDown, ChevronRight, Minimize2, Maximize2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

interface MapControlPanelProps {
  currentLayer: string;
  onLayerChange: (layer: string) => void;
  gridUnit: 'imperial' | 'metric';
  onGridUnitChange: (unit: 'imperial' | 'metric') => void;
  gridDensity: string;
  onGridDensityChange: (density: string) => void;
  terrainEnabled: boolean;
  onTerrainToggle: () => void;
}

type PanelSection = 'layers' | 'grid' | 'options' | 'help';

export function MapControlPanel({
  currentLayer,
  onLayerChange,
  gridUnit,
  onGridUnitChange,
  gridDensity,
  onGridDensityChange,
  terrainEnabled,
  onTerrainToggle,
}: MapControlPanelProps) {
  const { controlPanelMinimized, controlPanelSection, setControlPanelSection, toggleControlPanel } = useImmersiveMapUI();

  const toggleSection = (section: PanelSection) => {
    setControlPanelSection(controlPanelSection === section ? null : section);
  };

  if (controlPanelMinimized) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        className="fixed top-20 right-4 z-30"
      >
        <Button
          onClick={toggleControlPanel}
          size="icon"
          className="glass-panel rounded-full h-14 w-14"
        >
          <Layers className="h-5 w-5" />
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="fixed top-20 right-4 z-30 glass-panel rounded-xl p-3 w-64"
    >
      {/* Panel Header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-border/30">
        <h3 className="text-sm font-semibold">Map Controls</h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleControlPanel}
          className="h-6 w-6"
        >
          <Minimize2 className="h-3 w-3" />
        </Button>
      </div>

      {/* Layers Section */}
      <div className="mb-2">
        <button
          onClick={() => toggleSection('layers')}
          className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-accent/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            <span className="text-sm font-medium">Map Layers</span>
          </div>
          <ChevronRight
            className={`h-4 w-4 transition-transform ${
              controlPanelSection === 'layers' ? 'rotate-90' : ''
            }`}
          />
        </button>

        <AnimatePresence>
          {controlPanelSection === 'layers' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="pl-8 pr-2 py-2 space-y-1">
                {[
                  { value: 'satellite', label: 'Satellite' },
                  { value: 'terrain', label: 'Terrain' },
                  { value: 'topo', label: 'OpenTopoMap' },
                  { value: 'usgs', label: 'USGS Topo' },
                  { value: 'street', label: 'Street' },
                ].map((layer) => (
                  <button
                    key={layer.value}
                    onClick={() => onLayerChange(layer.value)}
                    className={`w-full text-left px-3 py-1.5 rounded text-sm transition-colors ${
                      currentLayer === layer.value
                        ? 'bg-primary/20 text-primary border border-primary/30'
                        : 'hover:bg-accent/50'
                    }`}
                  >
                    {layer.label}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Grid Section */}
      <div className="mb-2">
        <button
          onClick={() => toggleSection('grid')}
          className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-accent/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Grid3x3 className="h-4 w-4" />
            <span className="text-sm font-medium">Grid Settings</span>
          </div>
          <ChevronRight
            className={`h-4 w-4 transition-transform ${
              controlPanelSection === 'grid' ? 'rotate-90' : ''
            }`}
          />
        </button>

        <AnimatePresence>
          {controlPanelSection === 'grid' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="pl-8 pr-2 py-2 space-y-2">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Units</label>
                  <div className="flex gap-1">
                    <button
                      onClick={() => onGridUnitChange('imperial')}
                      className={`flex-1 px-2 py-1 text-xs rounded ${
                        gridUnit === 'imperial'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-accent/50 hover:bg-accent'
                      }`}
                    >
                      Imperial
                    </button>
                    <button
                      onClick={() => onGridUnitChange('metric')}
                      className={`flex-1 px-2 py-1 text-xs rounded ${
                        gridUnit === 'metric'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-accent/50 hover:bg-accent'
                      }`}
                    >
                      Metric
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Density</label>
                  <select
                    value={gridDensity}
                    onChange={(e) => onGridDensityChange(e.target.value)}
                    className="w-full px-2 py-1 text-xs rounded bg-accent/50 border border-border/30"
                  >
                    <option value="auto">Auto</option>
                    <option value="sparse">Sparse</option>
                    <option value="normal">Normal</option>
                    <option value="dense">Dense</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Options Section */}
      <div className="mb-2">
        <button
          onClick={() => toggleSection('options')}
          className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-accent/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="text-sm font-medium">Map Options</span>
          </div>
          <ChevronRight
            className={`h-4 w-4 transition-transform ${
              controlPanelSection === 'options' ? 'rotate-90' : ''
            }`}
          />
        </button>

        <AnimatePresence>
          {controlPanelSection === 'options' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="pl-8 pr-2 py-2">
                <button
                  onClick={onTerrainToggle}
                  className="w-full text-left px-3 py-1.5 rounded text-sm hover:bg-accent/50 transition-colors"
                >
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={terrainEnabled}
                      onChange={onTerrainToggle}
                      className="mr-2"
                    />
                    3D Terrain
                  </label>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Help Section */}
      <div>
        <button
          onClick={() => toggleSection('help')}
          className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-accent/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Help</span>
          </div>
          <ChevronRight
            className={`h-4 w-4 transition-transform ${
              controlPanelSection === 'help' ? 'rotate-90' : ''
            }`}
          />
        </button>

        <AnimatePresence>
          {controlPanelSection === 'help' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="pl-8 pr-2 py-2 text-xs text-muted-foreground space-y-1">
                <p><kbd className="px-1 py-0.5 bg-accent rounded text-xs">C</kbd> Toggle chat</p>
                <p><kbd className="px-1 py-0.5 bg-accent rounded text-xs">D</kbd> Drawing mode</p>
                <p><kbd className="px-1 py-0.5 bg-accent rounded text-xs">Esc</kbd> Close panel</p>
                <p><kbd className="px-1 py-0.5 bg-accent rounded text-xs">Space</kbd> Pan map</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
```

**Step 2: Commit control panel**

```bash
git add components/immersive-map/map-control-panel.tsx
git commit -m "feat: create MapControlPanel component

- Accordion-style sections: Layers, Grid, Options, Help
- Minimizes to single FAB icon
- Glassmorphism styling with smooth animations
- Shows keyboard shortcuts in Help section

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Create DrawingToolbar Component

**Files:**
- Create: `components/immersive-map/drawing-toolbar.tsx`

**Step 1: Create DrawingToolbar component**

Create `components/immersive-map/drawing-toolbar.tsx`:

```typescript
"use client";

import { useImmersiveMapUI } from "@/contexts/immersive-map-ui-context";
import { Button } from "@/components/ui/button";
import { Square, Circle, MapPin, Edit, Trash2, Check } from "lucide-react";
import { motion } from "framer-motion";

interface DrawingToolbarProps {
  onToolSelect: (tool: 'polygon' | 'circle' | 'point' | 'edit' | 'delete') => void;
  onZoneTypeClick: () => void;
  currentZoneType: string;
}

export function DrawingToolbar({
  onToolSelect,
  onZoneTypeClick,
  currentZoneType,
}: DrawingToolbarProps) {
  const { drawingMode, activeDrawTool, setActiveDrawTool, exitDrawingMode } = useImmersiveMapUI();

  if (!drawingMode) return null;

  const handleToolClick = (tool: 'polygon' | 'circle' | 'point' | 'edit' | 'delete') => {
    setActiveDrawTool(tool);
    onToolSelect(tool);
  };

  const tools = [
    { id: 'polygon' as const, icon: Square, label: 'Draw Polygon' },
    { id: 'circle' as const, icon: Circle, label: 'Draw Circle' },
    { id: 'point' as const, icon: MapPin, label: 'Add Point' },
    { id: 'edit' as const, icon: Edit, label: 'Edit Shape' },
    { id: 'delete' as const, icon: Trash2, label: 'Delete' },
  ];

  return (
    <motion.div
      initial={{ x: 100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 100, opacity: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="fixed right-4 top-1/2 -translate-y-1/2 z-30 glass-panel rounded-2xl p-2 flex flex-col gap-2 w-16"
    >
      {/* Zone Type Button */}
      <Button
        onClick={onZoneTypeClick}
        variant="outline"
        size="icon"
        className="w-12 h-12 rounded-xl"
        title="Select Zone Type"
      >
        <span className="text-xs font-semibold">{currentZoneType.substring(0, 2).toUpperCase()}</span>
      </Button>

      <div className="h-px bg-border/30 my-1" />

      {/* Drawing Tools */}
      {tools.map((tool) => {
        const Icon = tool.icon;
        const isActive = activeDrawTool === tool.id;

        return (
          <Button
            key={tool.id}
            onClick={() => handleToolClick(tool.id)}
            variant={isActive ? "default" : "ghost"}
            size="icon"
            className={`w-12 h-12 rounded-xl ${
              isActive ? 'shadow-lg' : ''
            }`}
            title={tool.label}
          >
            <Icon className="h-5 w-5" />
          </Button>
        );
      })}

      <div className="h-px bg-border/30 my-1" />

      {/* Done Button */}
      <Button
        onClick={exitDrawingMode}
        variant="default"
        size="icon"
        className="w-12 h-12 rounded-xl bg-green-600 hover:bg-green-700"
        title="Exit Drawing Mode"
      >
        <Check className="h-5 w-5" />
      </Button>
    </motion.div>
  );
}
```

**Step 2: Commit drawing toolbar**

```bash
git add components/immersive-map/drawing-toolbar.tsx
git commit -m "feat: create DrawingToolbar component

- Vertical toolbar on right side (desktop)
- Tools: Polygon, Circle, Point, Edit, Delete
- Zone type selector at top
- Done button to exit drawing mode
- Slide-in/out animations with Framer Motion

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Create BottomDrawer Component

**Files:**
- Create: `components/immersive-map/bottom-drawer.tsx`

**Step 1: Create BottomDrawer component**

Create `components/immersive-map/bottom-drawer.tsx`:

```typescript
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
```

**Step 2: Commit bottom drawer**

```bash
git add components/immersive-map/bottom-drawer.tsx
git commit -m "feat: create BottomDrawer component

- Slides up from bottom with spring physics
- Three height states: peek (80px), medium (40vh), max (80vh)
- Drag handle for resizing and dismissal
- Velocity-based snap points
- Backdrop overlay for dismissal

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Create ChatOverlay Component

**Files:**
- Create: `components/immersive-map/chat-overlay.tsx`

**Step 1: Create ChatOverlay component**

Create `components/immersive-map/chat-overlay.tsx`:

```typescript
"use client";

import { useImmersiveMapUI } from "@/contexts/immersive-map-ui-context";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EnhancedChatPanel } from "@/components/ai/enhanced-chat-panel";
import { useEffect } from "react";

interface ChatOverlayProps {
  farmId: string;
  onAnalyze: (query: string, conversationId?: string) => Promise<any>;
  initialConversationId?: string;
  initialMessage?: string;
  forceNewConversation?: boolean;
}

export function ChatOverlay({
  farmId,
  onAnalyze,
  initialConversationId,
  initialMessage,
  forceNewConversation,
}: ChatOverlayProps) {
  const { chatOpen, setChatOpen } = useImmersiveMapUI();

  // Keyboard shortcut: ESC to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && chatOpen) {
        setChatOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [chatOpen, setChatOpen]);

  return (
    <AnimatePresence>
      {chatOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setChatOpen(false)}
            className="fixed inset-0 glass-backdrop z-50"
          />

          {/* Chat Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="fixed top-0 right-0 bottom-0 w-full md:w-[400px] z-50 bg-background/95 backdrop-blur-2xl border-l border-border/40 shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border/40">
              <h2 className="text-lg font-semibold">AI Assistant</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setChatOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Chat Content */}
            <div className="flex-1 overflow-hidden">
              <EnhancedChatPanel
                farmId={farmId}
                initialConversationId={initialConversationId}
                initialMessage={initialMessage}
                forceNewConversation={forceNewConversation}
                onClose={() => setChatOpen(false)}
                onAnalyze={onAnalyze}
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
```

**Step 2: Commit chat overlay**

```bash
git add components/immersive-map/chat-overlay.tsx
git commit -m "feat: create ChatOverlay component

- Slides in from right with backdrop blur
- Full-screen on mobile, 400px sidebar on desktop
- ESC key to close
- Backdrop click to dismiss
- Reuses existing EnhancedChatPanel component

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 8: Create Main ImmersiveMapEditor Component (Part 1 - Structure)

**Files:**
- Create: `components/immersive-map/immersive-map-editor.tsx`

**Step 1: Create initial component structure**

Create `components/immersive-map/immersive-map-editor.tsx`:

```typescript
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ImmersiveMapUIProvider } from "@/contexts/immersive-map-ui-context";
import { CollapsibleHeader } from "./collapsible-header";
import { MapControlPanel } from "./map-control-panel";
import { DrawingToolbar } from "./drawing-toolbar";
import { BottomDrawer } from "./bottom-drawer";
import { ChatOverlay } from "./chat-overlay";
import { FarmMap } from "@/components/map/farm-map";
import { DeleteFarmDialog } from "@/components/shared/delete-farm-dialog";
import { GoalCaptureWizard } from "@/components/farm/goal-capture-wizard";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { Farm, Zone, FarmerGoal } from "@/lib/db/schema";
import type maplibregl from "maplibre-gl";
import { toPng } from "html-to-image";

interface ImmersiveMapEditorProps {
  farm: Farm;
  initialZones: Zone[];
  isOwner: boolean;
  initialIsPublic: boolean;
}

export function ImmersiveMapEditor({
  farm,
  initialZones,
  isOwner,
  initialIsPublic,
}: ImmersiveMapEditorProps) {
  const router = useRouter();

  // Map state
  const [zones, setZones] = useState<Zone[]>(initialZones);
  const [currentMapLayer, setCurrentMapLayer] = useState<string>("satellite");
  const [gridUnit, setGridUnit] = useState<'imperial' | 'metric'>("imperial");
  const [gridDensity, setGridDensity] = useState<string>("auto");
  const [terrainEnabled, setTerrainEnabled] = useState(false);

  // Save state
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);

  // Dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [showGoalsWizard, setShowGoalsWizard] = useState(false);

  // Goals state
  const [goals, setGoals] = useState<FarmerGoal[]>([]);

  // Chat state
  const [initialConversationId, setInitialConversationId] = useState<string | undefined>(undefined);
  const [vitalPrompt, setVitalPrompt] = useState<string | undefined>(undefined);
  const [startNewChat, setStartNewChat] = useState(false);

  // Map refs
  const mapRef = useRef<maplibregl.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  // Native species and plantings for AI context
  const [nativeSpecies, setNativeSpecies] = useState<any[]>([]);
  const [plantings, setPlantings] = useState<any[]>([]);

  // Zone type for drawing
  const [currentZoneType, setCurrentZoneType] = useState<string>("other");

  // Load goals, species, plantings on mount
  useEffect(() => {
    if (farm?.id) {
      loadGoals();
      loadNativeSpecies();
      loadPlantings();
    }
  }, [farm?.id]);

  const loadGoals = async () => {
    try {
      const response = await fetch(`/api/farms/${farm.id}/goals`);
      const data = await response.json();
      setGoals(data.goals || []);
    } catch (error) {
      console.error('Failed to load goals:', error);
    }
  };

  const loadNativeSpecies = async () => {
    try {
      const response = await fetch(`/api/farms/${farm.id}/native-species`);
      const data = await response.json();
      setNativeSpecies(data.perfect_match?.slice(0, 10) || []);
    } catch (error) {
      console.error('Failed to load native species:', error);
    }
  };

  const loadPlantings = async () => {
    try {
      const response = await fetch(`/api/farms/${farm.id}/plantings`);
      const data = await response.json();
      setPlantings(data.plantings || []);
    } catch (error) {
      console.error('Failed to load plantings:', error);
    }
  };

  // Save zones
  const handleSave = async (showAlert = true) => {
    setSaving(true);

    try {
      const res = await fetch(`/api/farms/${farm.id}/zones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zones }),
      });

      if (!res.ok) {
        throw new Error("Failed to save zones");
      }

      setHasUnsavedChanges(false);
      if (showAlert) {
        alert("Zones saved successfully!");
      }
    } catch (error) {
      if (showAlert) {
        alert("Failed to save zones");
      }
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  // Auto-save effect
  useEffect(() => {
    if (hasUnsavedChanges) {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }

      autoSaveTimer.current = setTimeout(() => {
        handleSave(false);
      }, 2000);
    }

    return () => {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }
    };
  }, [zones, hasUnsavedChanges]);

  // Handle zones change
  const handleZonesChange = (newZones: Zone[]) => {
    setZones(newZones);
    setHasUnsavedChanges(true);
  };

  // AI screenshot capture (reuse existing logic - placeholder for now)
  const captureMapScreenshot = useCallback(async (): Promise<string> => {
    // TODO: Implement screenshot capture (copy from FarmEditorClient)
    console.log("Screenshot capture not yet implemented");
    return "";
  }, []);

  // AI analyze handler (reuse existing logic - placeholder for now)
  const handleAnalyze = useCallback(
    async (query: string, conversationId?: string) => {
      // TODO: Implement AI analysis (copy from FarmEditorClient)
      console.log("AI analysis not yet implemented");
      return {
        response: "Not implemented",
        conversationId: "",
        analysisId: "",
        screenshot: "",
      };
    },
    []
  );

  return (
    <ImmersiveMapUIProvider>
      <div className="fixed inset-0 overflow-hidden">
        {/* Map Layer (full viewport) */}
        <div ref={mapContainerRef} className="absolute inset-0 z-0">
          <FarmMap
            farm={farm}
            zones={zones}
            onZonesChange={handleZonesChange}
            onMapReady={(map) => {
              mapRef.current = map;
            }}
            onMapLayerChange={setCurrentMapLayer}
            onGetRecommendations={() => {}}
          />
        </div>

        {/* Collapsible Header */}
        <CollapsibleHeader
          farm={farm}
          hasUnsavedChanges={hasUnsavedChanges}
          saving={saving}
          goalsCount={goals.length}
          isPublic={initialIsPublic}
          onSave={() => handleSave(true)}
          onOpenChat={() => {}}
          onOpenGoals={() => setShowGoalsWizard(true)}
          onDeleteClick={() => setDeleteDialogOpen(true)}
        />

        {/* Map Control Panel */}
        <MapControlPanel
          currentLayer={currentMapLayer}
          onLayerChange={setCurrentMapLayer}
          gridUnit={gridUnit}
          onGridUnitChange={setGridUnit}
          gridDensity={gridDensity}
          onGridDensityChange={setGridDensity}
          terrainEnabled={terrainEnabled}
          onTerrainToggle={() => setTerrainEnabled(!terrainEnabled)}
        />

        {/* Drawing Toolbar (conditional) */}
        <DrawingToolbar
          onToolSelect={(tool) => console.log("Tool selected:", tool)}
          onZoneTypeClick={() => console.log("Zone type click")}
          currentZoneType={currentZoneType}
        />

        {/* Bottom Drawer */}
        <BottomDrawer>
          <div>Drawer content goes here</div>
        </BottomDrawer>

        {/* Chat Overlay */}
        <ChatOverlay
          farmId={farm.id}
          onAnalyze={handleAnalyze}
          initialConversationId={initialConversationId}
          initialMessage={vitalPrompt}
          forceNewConversation={startNewChat}
        />

        {/* Dialogs */}
        <Dialog open={showGoalsWizard} onOpenChange={setShowGoalsWizard}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
            <DialogTitle className="sr-only">Set Your Farm Goals</DialogTitle>
            <DialogDescription className="sr-only">
              Define your permaculture goals to get personalized AI recommendations
            </DialogDescription>
            <GoalCaptureWizard
              farmId={farm.id}
              initialGoals={goals}
              onComplete={(newGoals) => {
                setGoals(newGoals);
                setShowGoalsWizard(false);
              }}
              onCancel={() => setShowGoalsWizard(false)}
            />
          </DialogContent>
        </Dialog>

        <DeleteFarmDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          farmName={farm.name}
          farmId={farm.id}
          onDeleteSuccess={() => {
            router.push("/dashboard");
          }}
        />
      </div>
    </ImmersiveMapUIProvider>
  );
}
```

**Step 2: Commit initial structure**

```bash
git add components/immersive-map/immersive-map-editor.tsx
git commit -m "feat: create ImmersiveMapEditor component structure

- Full viewport layout with position-absolute overlays
- Integrates all immersive components
- Reuses FarmMap component
- Save/auto-save logic maintained
- Goals and dialog management
- AI handlers (to be implemented)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 9: Integrate ImmersiveMapEditor with Context (Part 2)

**Files:**
- Modify: `components/immersive-map/immersive-map-editor.tsx`

**Step 1: Add context integration for chat and drawer**

Update the imports and add useImmersiveMapUI hook:

```typescript
import { useImmersiveMapUI } from "@/contexts/immersive-map-ui-context";
```

Inside the component function, add after the state declarations:

```typescript
export function ImmersiveMapEditor({ ... }: ImmersiveMapEditorProps) {
  // ... existing state ...

  // Get UI context
  const { setChatOpen, openDrawer } = useImmersiveMapUI();

  // ... rest of component ...
```

**Step 2: Wire up chat open handler**

Update the CollapsibleHeader onOpenChat prop:

```typescript
<CollapsibleHeader
  {/* ... other props ... */}
  onOpenChat={() => setChatOpen(true)}
  {/* ... other props ... */}
/>
```

**Step 3: Add keyboard shortcuts**

Add useEffect for keyboard shortcuts after other useEffects:

```typescript
// Keyboard shortcuts
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // C - Toggle chat
    if (e.key === 'c' && !e.metaKey && !e.ctrlKey) {
      const target = e.target as HTMLElement;
      // Don't trigger if typing in input
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      setChatOpen((prev) => !prev);
    }

    // H - Toggle header
    if (e.key === 'h' && !e.metaKey && !e.ctrlKey) {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      setHeaderCollapsed((prev) => !prev);
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []);
```

But wait - we need to import setHeaderCollapsed from context:

```typescript
const { setChatOpen, openDrawer, setHeaderCollapsed } = useImmersiveMapUI();
```

**Step 4: Commit context integration**

```bash
git add components/immersive-map/immersive-map-editor.tsx
git commit -m "feat: integrate ImmersiveMapEditor with UI context

- Wire up chat open/close via context
- Add keyboard shortcuts (C for chat, H for header)
- Connect drawer actions to context

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 10: Copy Screenshot & AI Analysis Logic (Part 3)

**Files:**
- Modify: `components/immersive-map/immersive-map-editor.tsx`

**Step 1: Copy buildLegendContext helper**

Add these helper functions before the component:

```typescript
/**
 * Build legend context text for AI
 */
const buildLegendContext = (currentMapLayer: string, zones: Zone[]) => {
  const layerNames: Record<string, string> = {
    satellite: "Satellite Imagery",
    terrain: "Terrain Map",
    topo: "OpenTopoMap",
    usgs: "USGS Topographic",
    street: "Street Map",
  };

  const zonesList = zones
    .map((z) => {
      const name = z.name || (z.properties ? JSON.parse(z.properties).name : null) || "Unlabeled";
      const type = z.zone_type || "other";
      return `  - ${name}: ${type}`;
    })
    .join("\n");

  return `
Map Configuration:
- Layer: ${layerNames[currentMapLayer as keyof typeof layerNames] || currentMapLayer}
- Grid System: A1, B2, C3 (columns west-to-east, rows south-to-north)
- Grid Spacing: 50ft (imperial) / 25m (metric)

Farm Boundary: Purple dashed outline (immutable)

Zones on map:
${zonesList || "  - No zones labeled yet"}
  `.trim();
};
```

**Step 2: Copy buildNativeSpeciesContext helper**

```typescript
const buildNativeSpeciesContext = (nativeSpecies: any[]) => {
  if (nativeSpecies.length === 0) {
    return 'No native species data available yet.';
  }

  const speciesList = nativeSpecies.map(s => {
    const functions = s.permaculture_functions
      ? JSON.parse(s.permaculture_functions).join(', ')
      : '';

    const zones = s.min_hardiness_zone && s.max_hardiness_zone
      ? `Zones ${s.min_hardiness_zone}-${s.max_hardiness_zone}`
      : '';

    return `  - ${s.common_name} (${s.scientific_name}): ${s.layer}, ${s.mature_height_ft}ft, ${zones}, functions: ${functions}`;
  }).join('\n');

  return `
Native Species Available for This Farm (Perfect Matches):
${speciesList}

When suggesting plants, prioritize these natives and explain their permaculture functions.
  `.trim();
};
```

**Step 3: Copy buildPlantingsContext helper**

```typescript
const buildPlantingsContext = (plantings: any[]) => {
  if (plantings.length === 0) {
    return 'No plantings added to this farm yet.';
  }

  const currentYear = new Date().getFullYear();

  const plantingsList = plantings.map(p => {
    const age = currentYear - (p.planted_year || currentYear);
    const customName = p.name ? ` "${p.name}"` : '';
    const size = p.mature_height_ft ? ` (mature: ${p.mature_height_ft}ft high)` : '';
    const notes = p.notes ? ` - Notes: ${p.notes}` : '';
    const commonName = p.common_name || 'Unknown plant';
    const scientificName = p.scientific_name || 'Unknown species';
    const layer = p.layer || 'unknown';

    return `  - ${commonName}${customName} (${scientificName}): ${layer} layer, planted ${p.planted_year || currentYear} (${age} years old)${size}, at ${(p.lat || 0).toFixed(6)}, ${(p.lng || 0).toFixed(6)}${notes}`;
  }).join('\n');

  return `
Existing Plantings on This Farm (${plantings.length} total):
${plantingsList}

IMPORTANT: When suggesting new plantings:
- DO NOT suggest duplicates of species already planted
- Consider spacing requirements relative to existing plantings
- Suggest companion plants that work well with what's already there
- Consider the mature size and spacing of existing plants
- Recommend guild arrangements around established plantings
  `.trim();
};
```

**Step 4: Copy buildGoalsContext helper**

```typescript
const buildGoalsContext = (goals: FarmerGoal[]) => {
  if (goals.length === 0) {
    return 'No specific goals defined yet. The farmer has not set any specific objectives.';
  }

  const goalsList = goals.map(goal => {
    const priorityMap: Record<number, string> = {
      1: 'lowest',
      2: 'low',
      3: 'medium',
      4: 'high',
      5: 'highest'
    };
    const priorityText = priorityMap[goal.priority] || 'medium';

    const timelineText = {
      'short': 'short-term (1 year)',
      'medium': 'medium-term (2-3 years)',
      'long': 'long-term (4+ years)'
    }[goal.timeline as keyof { short: string; medium: string; long: string }] || goal.timeline;

    let goalText = `  - ${goal.description} (${goal.goal_category}, ${priorityText} priority, ${timelineText})`;

    if (goal.targets) {
      try {
        const targets = JSON.parse(goal.targets as string);
        if (Array.isArray(targets) && targets.length > 0) {
          goalText += ` - Targets: ${targets.join(', ')}`;
        }
      } catch (e) {
        console.error("Failed to parse targets for goal:", goal.id);
      }
    }

    return goalText;
  }).join('\n');

  return `
FARMER GOALS (${goals.length} total):
${goalsList}

When making recommendations, prioritize suggestions that help achieve these specific goals,
especially those with higher priority ratings. Align your suggestions with the appropriate
timeline horizons (short, medium, or long-term).
  `.trim();
};
```

**Step 5: Update captureMapScreenshot implementation**

Replace the placeholder captureMapScreenshot with:

```typescript
const captureMapScreenshot = useCallback(async (): Promise<string> => {
  if (!mapContainerRef.current || !mapRef.current) {
    throw new Error("Map not ready");
  }

  // Wait for map to be fully loaded
  await new Promise<void>((resolve) => {
    let idleCount = 0;

    const checkReady = () => {
      const style = mapRef.current!.getStyle();
      const sourcesLoaded = Object.keys(style.sources).every(sourceId => {
        const source = mapRef.current!.getSource(sourceId);
        return !source || !source._tiles || Object.keys(source._tiles).length === 0 ||
               Object.values(source._tiles).every((tile: any) => tile.state === 'loaded');
      });

      if (sourcesLoaded && mapRef.current!.loaded() && !mapRef.current!.isMoving()) {
        idleCount++;
        if (idleCount >= 3) {
          setTimeout(() => resolve(), 500);
        } else {
          setTimeout(checkReady, 200);
        }
      } else {
        idleCount = 0;
        mapRef.current!.once("idle", checkReady);
      }
    };

    checkReady();

    setTimeout(() => resolve(), 10000);
  });

  const canvas = mapRef.current.getCanvas();

  const captureCanvasOnRender = (): Promise<string> => {
    return new Promise((resolve, reject) => {
      let captured = false;

      const captureHandler = () => {
        if (captured) return;
        captured = true;

        try {
          const dataUrl = canvas.toDataURL("image/png", 1.0);
          if (dataUrl.length < 50000) {
            reject(new Error("Canvas is blank"));
          } else {
            resolve(dataUrl);
          }
        } catch (error) {
          reject(error);
        }
      };

      mapRef.current!.once('render', captureHandler);
      mapRef.current!.triggerRepaint();

      setTimeout(() => {
        if (!captured) {
          captured = true;
          reject(new Error("Screenshot capture timed out"));
        }
      }, 3000);
    });
  };

  const canvasDataUrl = await captureCanvasOnRender();

  const tempImg = document.createElement('img');
  tempImg.src = canvasDataUrl;
  tempImg.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:0';
  tempImg.className = 'temp-screenshot-canvas';

  await new Promise((resolve) => {
    tempImg.onload = resolve;
    tempImg.onerror = resolve;
  });

  const mapCanvas = mapContainerRef.current.querySelector('canvas');
  if (mapCanvas && mapCanvas.parentElement) {
    mapCanvas.parentElement.insertBefore(tempImg, mapCanvas);
    (mapCanvas as HTMLElement).style.opacity = '0';
  }

  const screenshotData = await toPng(mapContainerRef.current, {
    quality: 0.9,
    pixelRatio: 1,
    cacheBust: false,
    skipFonts: true,
    filter: (node) => {
      if (node.classList) {
        if (node.classList.contains('temp-screenshot-canvas')) return true;
        if (node.classList.contains('maplibregl-ctrl')) return false;
        if (node.classList.contains('mapboxgl-ctrl')) return false;
      }
      if ((node as HTMLElement).hasAttribute?.('data-bottom-drawer')) {
        return false;
      }
      return true;
    },
  });

  tempImg.remove();
  if (mapCanvas) {
    (mapCanvas as HTMLElement).style.opacity = '1';
  }

  if (!screenshotData || screenshotData === "data:,") {
    throw new Error("Screenshot is empty");
  }

  const base64Length = screenshotData.replace(/^data:image\/\w+;base64,/, "").length;
  if (base64Length < 1000) {
    throw new Error("Screenshot appears to be blank.");
  }

  return screenshotData;
}, [mapContainerRef, mapRef]);
```

**Step 6: Update handleAnalyze implementation**

Replace the placeholder handleAnalyze:

```typescript
const handleAnalyze = useCallback(
  async (query: string, conversationId?: string) => {
    if (!mapContainerRef.current || !mapRef.current) {
      throw new Error("Map not ready");
    }

    const currentLayerScreenshot = await captureMapScreenshot();

    const originalLayer = currentMapLayer;
    const isTopoLayer = originalLayer === "usgs" || originalLayer === "topo" || originalLayer === "terrain";
    const secondLayer = isTopoLayer ? "satellite" : "usgs";

    let secondScreenshot: string;

    const currentStyle = mapRef.current.getStyle();

    let secondStyle;
    if (isTopoLayer) {
      secondStyle = {
        version: 8 as const,
        sources: {
          satellite: {
            type: "raster" as const,
            tiles: [
              "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            ],
            tileSize: 256,
            maxzoom: 19,
          },
        },
        layers: [{ id: "satellite", type: "raster" as const, source: "satellite" }],
      };
    } else {
      secondStyle = {
        version: 8 as const,
        sources: {
          usgs: {
            type: "raster" as const,
            tiles: [
              "https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}",
            ],
            tileSize: 256,
            maxzoom: 16,
          },
        },
        layers: [{ id: "usgs", type: "raster" as const, source: "usgs" }],
      };
    }

    mapRef.current.setStyle(secondStyle);

    await new Promise<void>((resolve) => {
      const onStyleData = () => {
        mapRef.current!.once("idle", () => {
          setTimeout(() => resolve(), 1000);
        });
      };

      if (mapRef.current!.isStyleLoaded()) {
        onStyleData();
      } else {
        mapRef.current!.once("styledata", onStyleData);
      }

      setTimeout(() => resolve(), 15000);
    });

    secondScreenshot = await captureMapScreenshot();

    mapRef.current.setStyle(currentStyle);

    await new Promise<void>((resolve) => {
      mapRef.current!.once("styledata", () => {
        mapRef.current!.once("idle", () => {
          setTimeout(() => resolve(), 500);
        });
      });
      setTimeout(() => resolve(), 10000);
    });

    const allCoords: number[][] = [];
    zones.forEach((zone) => {
      const geom = typeof zone.geometry === 'string' ? JSON.parse(zone.geometry) : zone.geometry;
      if (geom.type === 'Point') {
        allCoords.push(geom.coordinates);
      } else if (geom.type === 'LineString') {
        allCoords.push(...geom.coordinates);
      } else if (geom.type === 'Polygon') {
        allCoords.push(...geom.coordinates[0]);
      }
    });

    const farmBounds = allCoords.length > 0 ? {
      north: Math.max(...allCoords.map(c => c[1])),
      south: Math.min(...allCoords.map(c => c[1])),
      east: Math.max(...allCoords.map(c => c[0])),
      west: Math.min(...allCoords.map(c => c[0])),
    } : {
      north: farm.center_lat + 0.001,
      south: farm.center_lat - 0.001,
      east: farm.center_lng + 0.001,
      west: farm.center_lng - 0.001,
    };

    const analyzeRes = await fetch("/api/ai/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        farmId: farm.id,
        conversationId,
        query,
        screenshots: [
          { type: isTopoLayer ? "topo" : "satellite", data: currentLayerScreenshot },
          { type: isTopoLayer ? "satellite" : "topo", data: secondScreenshot },
        ],
        mapLayer: currentMapLayer,
        legendContext: buildLegendContext(currentMapLayer, zones),
        nativeSpeciesContext: buildNativeSpeciesContext(nativeSpecies),
        plantingsContext: buildPlantingsContext(plantings),
        goalsContext: buildGoalsContext(goals),
        zones: zones.map((zone) => {
          const geom = typeof zone.geometry === 'string' ? JSON.parse(zone.geometry) : zone.geometry;
          return {
            type: zone.zone_type,
            name: zone.name || "Unlabeled",
            geometryType: geom.type,
          };
        }),
      }),
    });

    if (!analyzeRes.ok) {
      const errorData = await analyzeRes.json().catch(() => ({ error: "Unknown error" }));
      const errorMessage = errorData.message || errorData.error || "Analysis failed";
      throw new Error(errorMessage);
    }

    const data = await analyzeRes.json();
    return {
      response: data.response,
      conversationId: data.conversationId,
      analysisId: data.analysisId,
      screenshot: currentLayerScreenshot,
      generatedImageUrl: data.generatedImageUrl,
    };
  },
  [farm.id, currentMapLayer, zones, mapContainerRef, mapRef, captureMapScreenshot, nativeSpecies, plantings, goals]
);
```

**Step 7: Commit AI logic**

```bash
git add components/immersive-map/immersive-map-editor.tsx
git commit -m "feat: implement screenshot capture and AI analysis

- Copy buildLegendContext, buildNativeSpeciesContext helpers
- Copy buildPlantingsContext, buildGoalsContext helpers
- Implement dual-screenshot capture logic
- Implement handleAnalyze with full context

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 11: Add Feature Flag and Routing

**Files:**
- Create: `.env.local` (if doesn't exist)
- Modify: `app/(app)/farm/[id]/page.tsx`

**Step 1: Add feature flag to environment**

Add to `.env.local`:

```
NEXT_PUBLIC_USE_IMMERSIVE_EDITOR=false
```

**Step 2: Update farm detail page to support feature flag**

Open `app/(app)/farm/[id]/page.tsx` and add import:

```typescript
import { ImmersiveMapEditor } from "@/components/immersive-map/immersive-map-editor";
```

Find the section where it renders for owners (around line 178) and replace:

```typescript
// If owner, show full editor dashboard (current behavior)
return (
  <div>
    <FarmEditorClient
      farm={farm}
      initialZones={zones}
      isOwner={isOwner}
      initialIsPublic={!!farm.is_public}
    />
    <div className="mt-8 px-4 pb-8">
      <h2 className="text-2xl font-bold mb-4 text-center">Farm Feed</h2>
      <FarmFeedClient
        farmId={id}
        initialData={initialFeedData}
        currentUserId={session.user.id}
      />
    </div>
  </div>
);
```

With:

```typescript
// Check feature flag
const useImmersiveEditor = process.env.NEXT_PUBLIC_USE_IMMERSIVE_EDITOR === 'true';

// If owner, show editor (immersive or classic based on flag)
if (useImmersiveEditor) {
  return (
    <ImmersiveMapEditor
      farm={farm}
      initialZones={zones}
      isOwner={isOwner}
      initialIsPublic={!!farm.is_public}
    />
  );
} else {
  return (
    <div>
      <FarmEditorClient
        farm={farm}
        initialZones={zones}
        isOwner={isOwner}
        initialIsPublic={!!farm.is_public}
      />
      <div className="mt-8 px-4 pb-8">
        <h2 className="text-2xl font-bold mb-4 text-center">Farm Feed</h2>
        <FarmFeedClient
          farmId={id}
          initialData={initialFeedData}
          currentUserId={session.user.id}
        />
      </div>
    </div>
  );
}
```

**Step 3: Commit feature flag**

```bash
git add .env.local app/(app)/farm/[id]/page.tsx
git commit -m "feat: add feature flag for immersive editor rollout

- Add NEXT_PUBLIC_USE_IMMERSIVE_EDITOR flag
- Route to ImmersiveMapEditor when flag enabled
- Fallback to FarmEditorClient when disabled
- Enables gradual rollout and A/B testing

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 12: Add Mobile Responsiveness

**Files:**
- Modify: `components/immersive-map/collapsible-header.tsx`
- Modify: `components/immersive-map/map-control-panel.tsx`
- Modify: `components/immersive-map/drawing-toolbar.tsx`
- Modify: `components/immersive-map/bottom-drawer.tsx`

**Step 1: Add mobile hook utility**

Create `hooks/use-media-query.ts`:

```typescript
import { useState, useEffect } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }

    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);

    return () => media.removeEventListener('change', listener);
  }, [matches, query]);

  return matches;
}
```

**Step 2: Add mobile adjustments to CollapsibleHeader**

In `components/immersive-map/collapsible-header.tsx`, import hook:

```typescript
import { useMediaQuery } from "@/hooks/use-media-query";
```

At top of component function:

```typescript
const isMobile = useMediaQuery('(max-width: 767px)');
```

Update the motion.header animate prop:

```typescript
animate={{
  height: headerCollapsed ? (isMobile ? 0 : 48) : (isMobile ? 56 : 120),
  paddingTop: headerCollapsed ? 0 : (isMobile ? 8 : 16),
  paddingBottom: headerCollapsed ? 0 : (isMobile ? 8 : 12),
}}
```

**Step 3: Add mobile drawer height adjustments**

In `components/immersive-map/bottom-drawer.tsx`, import hook:

```typescript
import { useMediaQuery } from "@/hooks/use-media-query";
```

At top of component:

```typescript
const isMobile = useMediaQuery('(max-width: 767px)');

const heightMap = isMobile
  ? {
      peek: 'calc(100% - 100px)',
      medium: '50vh',
      max: '15vh',
    }
  : {
      peek: 'calc(100% - 80px)',
      medium: '60vh',
      max: '20vh',
    };
```

Update drag handle size:

```typescript
<div className={`${isMobile ? 'w-12 h-1.5' : 'w-12 h-1.5'} bg-muted-foreground/30 rounded-full`} />
```

**Step 4: Commit mobile responsiveness**

```bash
git add hooks/use-media-query.ts components/immersive-map/*.tsx
git commit -m "feat: add mobile responsiveness to immersive editor

- Create useMediaQuery hook for breakpoint detection
- Mobile header: 56px expanded, slides off when collapsed
- Mobile drawer: Larger peek (100px), different snap points
- Mobile-optimized touch targets and spacing

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 13: Testing & Refinement

**Step 1: Enable immersive editor locally**

Update `.env.local`:

```
NEXT_PUBLIC_USE_IMMERSIVE_EDITOR=true
```

**Step 2: Run development server**

```bash
npm run dev
```

Open browser to http://localhost:3000, navigate to a farm detail page.

**Step 3: Manual testing checklist**

Test these scenarios:

- [ ] Header auto-collapses when panning map
- [ ] Header expands on hover or click
- [ ] Map control panel shows layers, grid, options, help
- [ ] Control panel minimizes to FAB
- [ ] Drawing toolbar appears when entering draw mode
- [ ] Drawing toolbar disappears when clicking Done
- [ ] Bottom drawer slides up when selecting zone
- [ ] Bottom drawer can be dragged to resize
- [ ] Bottom drawer dismisses on backdrop click
- [ ] Chat overlay opens with backdrop blur
- [ ] Chat overlay closes with ESC key or backdrop click
- [ ] AI screenshot capture works
- [ ] AI analysis returns response
- [ ] Save functionality works
- [ ] Goals wizard opens and closes
- [ ] Dark mode works correctly
- [ ] Mobile view works (resize browser to 375px width)

**Step 4: Fix any bugs discovered**

Make necessary adjustments to components based on testing.

**Step 5: Commit test results**

```bash
git add .
git commit -m "test: manual testing of immersive editor

- Verified all animations work smoothly
- Tested keyboard shortcuts
- Confirmed mobile responsiveness
- Fixed [list any bugs fixed]

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 14: Documentation & Cleanup

**Step 1: Create README for immersive components**

Create `components/immersive-map/README.md`:

```markdown
# Immersive Map Editor Components

Full-screen, immersive map experience for farm detail pages.

## Components

### `ImmersiveMapEditor`
Main component that orchestrates all immersive UI.

**Props:**
- `farm: Farm` - Farm data
- `initialZones: Zone[]` - Initial zones
- `isOwner: boolean` - Ownership flag
- `initialIsPublic: boolean` - Public visibility

### `CollapsibleHeader`
Auto-collapsing header that shrinks on map interaction.

**Key Features:**
- Auto-collapse on first map interaction
- Expand on hover or click
- Smooth Framer Motion animations
- Mobile: slides completely off-screen when collapsed

### `MapControlPanel`
Consolidated map settings panel (layers, grid, options).

**Key Features:**
- Accordion-style sections
- Minimizes to FAB icon
- Glassmorphism styling
- Keyboard shortcuts in Help section

### `DrawingToolbar`
Vertical toolbar for zone drawing tools.

**Key Features:**
- Only visible when in drawing mode
- Tools: Polygon, Circle, Point, Edit, Delete
- Zone type selector
- Done button to exit

### `BottomDrawer`
Slide-up drawer for zone/planting details.

**Key Features:**
- Three height states: peek, medium, max
- Drag to resize
- Spring physics animations
- Velocity-based dismissal

### `ChatOverlay`
AI chat panel with backdrop blur.

**Key Features:**
- Slides in from right
- Backdrop blur effect
- ESC key to close
- Full-screen on mobile

## Context

### `ImmersiveMapUIContext`
Centralized state for all UI panels.

**Usage:**
```tsx
const { chatOpen, setChatOpen, openDrawer, closeDrawer } = useImmersiveMapUI();
```

## Keyboard Shortcuts

- `C` - Toggle chat panel
- `H` - Toggle header expand/collapse
- `Esc` - Close active panel/drawer
- `D` - Enter drawing mode (when implemented)

## Feature Flag

Control rollout via `.env.local`:

```
NEXT_PUBLIC_USE_IMMERSIVE_EDITOR=true
```

Set to `false` to use classic editor.
```

**Step 2: Update main CLAUDE.md**

Add section to `CLAUDE.md`:

```markdown
## Immersive Map Editor

The farm detail page has two implementations:

1. **Classic Editor** (`FarmEditorClient`) - Original implementation
2. **Immersive Editor** (`ImmersiveMapEditor`) - Full-screen experience

### Feature Flag

Controlled via `NEXT_PUBLIC_USE_IMMERSIVE_EDITOR` environment variable.

### Components

Located in `components/immersive-map/`:
- `immersive-map-editor.tsx` - Main component
- `collapsible-header.tsx` - Auto-collapsing header
- `map-control-panel.tsx` - Map settings panel
- `drawing-toolbar.tsx` - Drawing tools (conditional)
- `bottom-drawer.tsx` - Slide-up details drawer
- `chat-overlay.tsx` - AI chat overlay

### State Management

Uses `ImmersiveMapUIContext` (in `contexts/`) for centralized panel visibility.

### Design Reference

See `docs/plans/2026-02-12-immersive-map-design.md` for full specifications.
```

**Step 3: Commit documentation**

```bash
git add components/immersive-map/README.md CLAUDE.md
git commit -m "docs: add immersive map editor documentation

- Create README for immersive-map components
- Document keyboard shortcuts and usage
- Update main CLAUDE.md with feature flag info
- Add component reference guide

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 15: Final Review & Deployment Prep

**Step 1: Review all changes**

```bash
git log --oneline -20
```

Verify commit messages are clear and descriptive.

**Step 2: Check TypeScript compilation**

```bash
npm run build
```

Expected: No TypeScript errors, successful build.

**Step 3: Verify no console errors**

Run dev server and check browser console:

```bash
npm run dev
```

Navigate to farm detail page, interact with all UI elements.
Check console for errors or warnings.

**Step 4: Prepare deployment checklist**

Create `docs/plans/immersive-editor-rollout-checklist.md`:

```markdown
# Immersive Editor Rollout Checklist

## Pre-Deployment

- [ ] All TypeScript errors resolved
- [ ] Manual testing completed
- [ ] Mobile testing completed (375px, 768px, 1024px widths)
- [ ] Dark mode verified
- [ ] Screenshot capture tested
- [ ] AI analysis tested
- [ ] All animations smooth (60fps)
- [ ] No console errors in production build

## Phase 1: Development

- [ ] Feature flag set to `false` in production
- [ ] Deploy to staging environment
- [ ] Team testing for 2 days
- [ ] Collect feedback, fix bugs

## Phase 2: Beta Testing

- [ ] Enable for 10% of users via A/B test
- [ ] Monitor error rates (Sentry)
- [ ] Track engagement metrics
- [ ] Collect user feedback
- [ ] Fix critical bugs within 24h

## Phase 3: Gradual Rollout

- [ ] Day 1: 25% of users
- [ ] Day 2: 50% of users
- [ ] Day 3: 75% of users
- [ ] Day 4: 100% of users

## Phase 4: Cleanup

- [ ] Monitor for 1 week at 100%
- [ ] Remove `FarmEditorClient` (if no issues)
- [ ] Remove feature flag
- [ ] Update documentation
- [ ] Mark rollout complete

## Rollback Plan

If critical issues occur:

1. Set `NEXT_PUBLIC_USE_IMMERSIVE_EDITOR=false`
2. Deploy immediately
3. Investigate issue in development
4. Fix and re-test before re-enabling
```

**Step 5: Final commit**

```bash
git add docs/plans/immersive-editor-rollout-checklist.md
git commit -m "docs: add rollout checklist for immersive editor

- Pre-deployment verification steps
- Phased rollout plan (10% → 100%)
- Monitoring and metrics to track
- Rollback procedure for critical issues

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Summary

Implementation complete! The immersive map editor includes:

✅ Glassmorphism CSS variables and utilities
✅ ImmersiveMapUIContext for centralized state
✅ CollapsibleHeader with auto-collapse
✅ MapControlPanel with accordion sections
✅ DrawingToolbar for zone drawing
✅ BottomDrawer with spring physics
✅ ChatOverlay with backdrop blur
✅ ImmersiveMapEditor main component
✅ Screenshot capture and AI analysis
✅ Feature flag for gradual rollout
✅ Mobile responsiveness
✅ Documentation and rollout plan

**Total commits:** 15
**Estimated time:** 5-7 days for full implementation
**Lines of code:** ~2000+ across all components

**Next steps:**
1. Enable feature flag locally for testing
2. Deploy to staging environment
3. Begin phased rollout per checklist

---

**References:**
- Design doc: `docs/plans/2026-02-12-immersive-map-design.md`
- Component README: `components/immersive-map/README.md`
- Rollout checklist: `docs/plans/immersive-editor-rollout-checklist.md`
