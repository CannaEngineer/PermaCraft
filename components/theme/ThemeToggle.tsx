'use client';

import { useTheme } from './ThemeProvider';
import { Button } from '@/components/ui/button';
import { Palmtree, MonitorIcon, Zap, Moon, Check } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

const themes = [
  {
    value: 'modern',
    label: 'Modern',
    description: 'Clean & minimal',
    icon: Palmtree,
  },
  {
    value: 'windows-xp',
    label: 'Windows XP',
    description: 'Retro nostalgia',
    icon: MonitorIcon,
  },
  {
    value: 'neon',
    label: 'Neon',
    description: 'Cyberpunk vibes',
    icon: Zap,
  },
  {
    value: 'true-dark',
    label: 'True Dark',
    description: 'OLED optimized',
    icon: Moon,
  },
] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const currentTheme = themes.find(t => t.value === theme) || themes[0];
  const CurrentIcon = currentTheme.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 w-full justify-start h-auto py-3">
          <CurrentIcon className="h-5 w-5" />
          <div className="flex-1 text-left">
            <p className="font-medium text-sm">{currentTheme.label}</p>
            <p className="text-xs text-muted-foreground">{currentTheme.description}</p>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56 z-[80]">
        <DropdownMenuLabel className="text-foreground">Choose Theme</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {themes.map((themeOption) => {
          const Icon = themeOption.icon;
          const isActive = theme === themeOption.value;

          return (
            <DropdownMenuItem
              key={themeOption.value}
              onClick={() => setTheme(themeOption.value as any)}
              className="flex items-center gap-3 py-3 cursor-pointer text-foreground"
            >
              <Icon className="h-4 w-4 text-foreground" />
              <div className="flex-1">
                <p className="font-medium text-sm text-foreground">{themeOption.label}</p>
                <p className="text-xs text-muted-foreground">{themeOption.description}</p>
              </div>
              {isActive && <Check className="h-4 w-4 text-primary" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
