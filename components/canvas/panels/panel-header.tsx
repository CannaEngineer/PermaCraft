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
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border/40 flex-shrink-0">
      {hasBack && (
        <button
          onClick={popPanel}
          className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-lg hover:bg-accent transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
      )}
      <div className="flex-1 min-w-0">
        <h2 className="text-base font-semibold truncate">{title}</h2>
        {subtitle && (
          <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
        )}
      </div>
      <button
        onClick={handleClose}
        className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-lg hover:bg-accent transition-colors"
        aria-label="Close panel"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
