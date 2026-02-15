'use client';

import { FAB, FABAction } from '@/components/ui/fab';
import { Square, MapPin, MessageSquare, Upload, Waves, Sparkles, Calendar } from 'lucide-react';
import { useImmersiveMapUI } from '@/contexts/immersive-map-ui-context';

interface MapFABProps {
  onCreatePost: () => void;
  onUploadPhoto: () => void;
  onDropPin: () => void;
  onWaterSystem: () => void;
  onBuildGuild: () => void;
  onTimeline: () => void;
}

export function MapFAB({ onCreatePost, onUploadPhoto, onDropPin, onWaterSystem, onBuildGuild, onTimeline }: MapFABProps) {
  const { enterDrawingMode, setActiveDrawTool } = useImmersiveMapUI();

  const handleDrawShape = () => {
    enterDrawingMode();
    setActiveDrawTool('polygon');
  };

  const handleDropPin = () => {
    enterDrawingMode();
    setActiveDrawTool('point');
  };

  const actions: FABAction[] = [
    {
      icon: <Waves className="h-5 w-5" />,
      label: 'Water System',
      onClick: onWaterSystem,
      color: 'bg-blue-600 text-white'
    },
    {
      icon: <Sparkles className="h-5 w-5" />,
      label: 'Build Guild',
      onClick: onBuildGuild,
      color: 'bg-amber-600 text-white'
    },
    {
      icon: <Calendar className="h-5 w-5" />,
      label: 'Timeline',
      onClick: onTimeline,
      color: 'bg-purple-600 text-white'
    },
    {
      icon: <Square className="h-5 w-5" />,
      label: 'Draw Shape',
      onClick: handleDrawShape,
      color: 'bg-green-600 text-white'
    },
    {
      icon: <MapPin className="h-5 w-5" />,
      label: 'Drop Pin',
      onClick: handleDropPin,
      color: 'bg-emerald-600 text-white'
    },
    {
      icon: <MessageSquare className="h-5 w-5" />,
      label: 'Create Post',
      onClick: onCreatePost,
      color: 'bg-violet-600 text-white'
    },
    {
      icon: <Upload className="h-5 w-5" />,
      label: 'Upload Photo',
      onClick: onUploadPhoto,
      color: 'bg-orange-600 text-white'
    }
  ];

  return (
    <FAB
      actions={actions}
      ariaLabel="Map actions"
      className="md:bottom-24 md:right-8"
    />
  );
}
