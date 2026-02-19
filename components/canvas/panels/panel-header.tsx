'use client';

import { ArrowLeft, X } from 'lucide-react';
import { useUnifiedCanvas } from '@/contexts/unified-canvas-context';

interface PanelHeaderProps {
  title: string;
  subtitle?: string;
  onClose?: () => void;
}

export function PanelHeader({ title, subtitle, onClose }: PanelHeaderProps) {
  const { panelStack, popPanel, setContextPanelOpen } = useUnifiedCanvas();
  const hasBack = panelStack.length > 0;

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      setContextPanelOpen(false);
    }
  };

  return (
    <div className="flex items-center gap-3 px-5 py-4 border-b border-border/40">
      {hasBack && (
        <button
          onClick={popPanel}
          className="flex-shrink-0 p-1.5 -ml-1.5 rounded-lg hover:bg-accent transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
      )}
      <div className="flex-1 min-w-0">
        <h2 className="text-sm font-semibold truncate">{title}</h2>
        {subtitle && (
          <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
        )}
      </div>
      <button
        onClick={handleClose}
        className="flex-shrink-0 p-1.5 -mr-1.5 rounded-lg hover:bg-accent transition-colors"
        aria-label="Close panel"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
