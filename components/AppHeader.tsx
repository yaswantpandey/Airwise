'use client';

import { SlidersHorizontal } from 'lucide-react';
import type { TabKey } from '@/hooks/use-airwise-state';

export interface NavItem {
  key: TabKey;
  label: string;
}

interface AppHeaderProps {
  navItems: NavItem[];
  activeTab: TabKey;
  profileBtnLabel: string;
  onSelectTab: (tab: TabKey) => void;
  onOpenProfile: () => void;
}

export function AppHeader({
  navItems,
  activeTab,
  profileBtnLabel,
  onSelectTab,
  onOpenProfile,
}: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-xs dark:border-slate-800 dark:bg-[#0B1117]/95">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-8 px-4 py-3.5 sm:px-6">
        <button
          type="button"
          onClick={() => onSelectTab('now')}
          className="text-lg font-bold tracking-tight text-slate-950 whitespace-nowrap shrink-0 dark:text-white"
        >
          AirWise
        </button>

        <nav aria-label="Primary navigation" className="hidden items-center gap-6 md:flex">
          {navItems.map((item) => {
            const active = activeTab === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onSelectTab(item.key)}
                aria-current={active ? 'page' : undefined}
                className={`min-h-[40px] border-b-2 px-1 text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'border-teal-700 text-teal-800 dark:border-teal-400 dark:text-teal-300'
                    : 'border-transparent text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-slate-100'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="shrink-0">
          <button
            type="button"
            onClick={onOpenProfile}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-teal-800 whitespace-nowrap shrink-0 dark:bg-teal-600 dark:hover:bg-teal-500"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{profileBtnLabel}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
