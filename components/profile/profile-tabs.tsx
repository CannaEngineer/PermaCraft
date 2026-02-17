'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

interface ProfileTabsProps {
  tabs: { id: string; label: string; count?: number }[];
  children: (activeTab: string) => React.ReactNode;
}

export function ProfileTabs({ tabs, children }: ProfileTabsProps) {
  const [activeTab, setActiveTab] = useState(tabs[0]?.id || 'posts');

  return (
    <div>
      {/* Tab Bar */}
      <div className="border-b">
        <div className="flex gap-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'px-6 py-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
              )}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="ml-1.5 text-xs text-muted-foreground">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="py-6">{children(activeTab)}</div>
    </div>
  );
}
