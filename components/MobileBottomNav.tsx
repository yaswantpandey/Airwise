'use client';

import type { ComponentType } from 'react';
import type { TabKey } from '@/hooks/use-airwise-state';

export interface MobileNavItem {
  key: TabKey;
  label: string;
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
}

interface MobileBottomNavProps {
  items: MobileNavItem[];
  activeTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
}

export function MobileBottomNav({ items, activeTab, onSelectTab }: MobileBottomNavProps) {
  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed bottom-0 left-0 right-0 z-30 grid grid-cols-6 border-t border-slate-200 bg-white/95 backdrop-blur-xs md:hidden dark:border-slate-800 dark:bg-[#0B1117]/95"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const active = activeTab === item.key;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onSelectTab(item.key)}
            aria-current={active ? 'page' : undefined}
            className={`flex min-h-[54px] flex-col items-center justify-center gap-0.5 px-0.5 text-[10px] font-medium ${
              active
                ? 'text-teal-800 dark:text-teal-300'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden={true} />
            <span className="max-w-[58px] truncate">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
