'use client';

import { useTheme } from './ThemeProvider';
import { Button } from '@/components/ui/button';
import { Palmtree, MonitorIcon } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          {theme === 'windows-xp' ? (
            <MonitorIcon className="h-4 w-4" />
          ) : (
            <Palmtree className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">Theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="xp-panel">
        <DropdownMenuItem onClick={() => setTheme('modern')} className="xp-menu-item">
          <Palmtree className="h-4 w-4 mr-2" />
          Modern (Default)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('windows-xp')} className="xp-menu-item">
          <MonitorIcon className="h-4 w-4 mr-2" />
          Windows XP Retro
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
