'use client';

import { PanelHeader } from './panel-header';
import { useUnifiedCanvas } from '@/contexts/unified-canvas-context';
import { Droplets, Leaf, Layers, Timer, Download, ListTree, MessageSquare, Globe, ArrowRight } from 'lucide-react';

interface FarmPanelProps {
  onOpenDrawer?: (content: string) => void;
}

export function FarmPanel({ onOpenDrawer }: FarmPanelProps) {
  const { activeFarm, setActiveSection } = useUnifiedCanvas();

  if (!activeFarm) {
    return (
      <div className="flex flex-col h-full">
        <PanelHeader title="Farm" />
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-sm text-muted-foreground text-center">
            No farm selected. Choose a farm from the switcher above.
          </p>
        </div>
      </div>
    );
  }

  const tools = [
    { id: 'water-system', label: 'Water System', icon: Droplets, color: 'text-blue-500' },
    { id: 'guild-designer', label: 'Build Guild', icon: Leaf, color: 'text-green-500' },
    { id: 'phase-manager', label: 'Timeline', icon: Timer, color: 'text-orange-500' },
    { id: 'export', label: 'Export', icon: Download, color: 'text-purple-500' },
  ];

  return (
    <div className="flex flex-col h-full">
      <PanelHeader
        title={activeFarm.name}
        subtitle={[
          activeFarm.acres ? `${activeFarm.acres} acres` : null,
          activeFarm.climate_zone ? `Zone ${activeFarm.climate_zone}` : null,
        ].filter(Boolean).join(' \u00b7 ')}
      />
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Farm info summary */}
        <div className="rounded-xl bg-accent/30 p-3 text-sm text-muted-foreground">
          <p>{activeFarm.description || 'No description set.'}</p>
        </div>

        {/* Design tools grid */}
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Design Tools
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {tools.map((tool) => (
              <button
                key={tool.id}
                onClick={() => onOpenDrawer?.(tool.id)}
                className="flex items-center gap-2.5 p-3 rounded-xl hover:bg-accent/50 transition-colors text-left"
              >
                <tool.icon className={`h-5 w-5 ${tool.color}`} />
                <span className="text-sm font-medium">{tool.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Feature manager */}
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Features
          </h3>
          <button
            onClick={() => onOpenDrawer?.('details')}
            className="w-full flex items-center gap-2.5 p-3 rounded-xl hover:bg-accent/50 transition-colors text-left"
          >
            <ListTree className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm">Feature Manager</span>
          </button>
        </div>

        {/* Cross-links to other sections */}
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Quick Access
          </h3>
          <div className="space-y-1">
            <button
              onClick={() => setActiveSection('ai')}
              className="w-full flex items-center gap-2.5 p-3 rounded-xl hover:bg-accent/50 transition-colors text-left group"
            >
              <MessageSquare className="h-4 w-4 text-blue-500" />
              <span className="text-sm flex-1">AI Design Assistant</span>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
            <button
              onClick={() => setActiveSection('plants')}
              className="w-full flex items-center gap-2.5 p-3 rounded-xl hover:bg-accent/50 transition-colors text-left group"
            >
              <Leaf className="h-4 w-4 text-emerald-500" />
              <span className="text-sm flex-1">Browse Species</span>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
            <button
              onClick={() => setActiveSection('explore')}
              className="w-full flex items-center gap-2.5 p-3 rounded-xl hover:bg-accent/50 transition-colors text-left group"
            >
              <Globe className="h-4 w-4 text-blue-500" />
              <span className="text-sm flex-1">Community</span>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
