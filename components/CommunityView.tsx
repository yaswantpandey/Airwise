'use client';

import { useMemo } from 'react';
import { Lock, Users } from 'lucide-react';
import { calculateImpactStats } from '@/lib/air-quality';
import type { Translations } from '@/lib/i18n';
import { SEED_COMMUNITY_GROUPS } from '@/lib/seed-data';
import type {
  ActionLogEntry,
  CommunityLeaderboardEntry,
  HouseholdProfile,
  LanguageCode,
} from '@/lib/types';

interface CommunityViewProps {
  profile: HouseholdProfile;
  logs: ActionLogEntry[];
  cloudContributions: CommunityLeaderboardEntry[];
  language: LanguageCode;
  t: Translations;
  onSelectGroup: (groupId: string) => void;
}

export function CommunityView({
  profile,
  logs,
  cloudContributions,
  language,
  t,
  onSelectGroup,
}: CommunityViewProps) {
  const isHi = language === 'hi';
  const myStats = useMemo(() => calculateImpactStats(logs), [logs]);

  const activeGroup = useMemo(() => {
    return (
      SEED_COMMUNITY_GROUPS.find((g) => g.id === profile.communityGroupId) ||
      SEED_COMMUNITY_GROUPS[0]
    );
  }, [profile.communityGroupId]);

  // Merge seeded neighborhood households with live cloud entries and the current user's household alias
  const leaderboard = useMemo(() => {
    const map = new Map<string, CommunityLeaderboardEntry>();
    for (const row of activeGroup.leaderboard) {
      map.set(row.id, row);
    }
    for (const cloudRow of cloudContributions) {
      map.set(cloudRow.id, cloudRow);
    }

    const alreadyHasMe = Array.from(map.values()).some((r) => r.isCurrentUser);
    if (!alreadyHasMe) {
      map.set('current-household', {
        id: 'current-household',
        alias: profile.displayLabel || 'My Household',
        weeklyActions: myStats.weeklyActions,
        weeklyCo2SavedKg: myStats.weeklyCo2SavedKg,
        weeklyExposureAvoidedUg: myStats.weeklyPm25AvoidedUg,
        streakDays: myStats.streakDays,
        isCurrentUser: true,
      });
    }

    return Array.from(map.values()).sort(
      (a, b) => b.weeklyActions - a.weeklyActions || b.weeklyCo2SavedKg - a.weeklyCo2SavedKg
    );
  }, [activeGroup, cloudContributions, profile.displayLabel, myStats]);

  const totalGroupActions = useMemo(
    () => leaderboard.reduce((sum, r) => sum + r.weeklyActions, 0),
    [leaderboard]
  );
  const totalGroupCo2 = useMemo(
    () => Math.round(leaderboard.reduce((sum, r) => sum + r.weeklyCo2SavedKg, 0) * 10) / 10,
    [leaderboard]
  );
  const progressPct = Math.min(
    100,
    Math.round((totalGroupActions / activeGroup.challengeTargetActions) * 100)
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl dark:text-slate-50">
          {t.communityTitle}
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          {t.communitySubtitle}
        </p>
      </div>

      {/* Group Selector Tabs */}
      <div
        role="tablist"
        aria-label="Community groups"
        className="flex flex-wrap gap-2"
      >
        {SEED_COMMUNITY_GROUPS.map((group) => {
          const selected = group.id === activeGroup.id;
          return (
            <button
              key={group.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onSelectGroup(group.id)}
              className={`min-h-[44px] rounded-lg border px-4 py-2 text-left text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                selected
                  ? 'border-teal-700 bg-teal-700 text-white dark:border-teal-500 dark:bg-teal-600'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:text-slate-950 dark:border-slate-800 dark:bg-[#131C26] dark:text-slate-300 dark:hover:text-white'
              }`}
            >
              {group.name}
            </button>
          );
        })}
      </div>

      {/* Active Challenge & Playbook Grid */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Shared Challenge Progress */}
        <section className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-3 dark:border-slate-800 dark:bg-[#131C26]">
          <div className="flex flex-wrap items-center gap-x-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium text-teal-800 dark:text-teal-300">
              {activeGroup.groupType.toUpperCase()}
            </span>
            <span aria-hidden="true">·</span>
            <span>
              {activeGroup.area}, {activeGroup.city}
            </span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1 font-mono tabular-nums">
              <Users className="h-3.5 w-3.5" aria-hidden="true" />
              {leaderboard.length} {isHi ? 'परिवार सक्रिय' : 'active households'}
            </span>
          </div>

          <h2 className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-50">
            {activeGroup.challengeTitle}
          </h2>

          <div className="mt-5 space-y-2">
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {t.challengeProgress}
              </span>
              <span className="font-mono font-semibold tabular-nums text-slate-900 dark:text-white">
                {totalGroupActions} / {activeGroup.challengeTargetActions}{' '}
                <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                  ({progressPct}%)
                </span>
              </span>
            </div>
            <div
              className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
              role="progressbar"
              aria-valuenow={progressPct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={t.challengeProgress}
            >
              <div
                className="h-full rounded-full bg-teal-700 transition-all duration-300 dark:bg-teal-400"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="pt-1 text-xs text-slate-500 font-mono tabular-nums dark:text-slate-400">
              {isHi
                ? `समुदाय द्वारा इस सप्ताह अनुमानित ~${totalGroupCo2} kg CO2 की बचत`
                : `Estimated ~${totalGroupCo2} kg CO2 saved collectively this week (approximate)`}
            </p>
          </div>
        </section>

        {/* Local Aggregated Tips */}
        <section className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-2 dark:border-slate-800 dark:bg-[#131C26]">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {t.communityTipsHeading}
          </h2>
          <ul className="mt-4 space-y-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            {activeGroup.tips.map((tip, idx) => (
              <li key={idx} className="flex items-start gap-2.5">
                <span className="mt-1.5 font-mono text-xs font-semibold text-teal-700 dark:text-teal-400">
                  0{idx + 1}.
                </span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Anonymized Leaderboard (Zero PII) */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#131C26]">
        <div className="flex flex-col gap-2 pb-4 border-b border-slate-100 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {t.leaderboardHeading}
          </h2>
          <p className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Lock className="h-3.5 w-3.5 shrink-0 text-teal-700 dark:text-teal-400" aria-hidden="true" />
            <span>{t.privacyNoticeLeaderboard}</span>
          </p>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[540px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <th className="pb-2.5 pr-4">#</th>
                <th className="pb-2.5 pr-4">{isHi ? 'घरेलू उपनाम' : 'Household Alias'}</th>
                <th className="pb-2.5 pr-4 text-right">{isHi ? 'साप्ताहिक कदम' : 'Weekly Actions'}</th>
                <th className="pb-2.5 pr-4 text-right">{isHi ? 'CO2 बचत (अनुमानित)' : 'Est. CO2 Saved'}</th>
                <th className="pb-2.5 text-right">{isHi ? 'स्ट्रीक' : 'Streak'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {leaderboard.map((row, idx) => (
                <tr
                  key={row.id}
                  className={
                    row.isCurrentUser
                      ? 'bg-teal-50/70 font-semibold dark:bg-teal-950/35'
                      : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/30'
                  }
                >
                  <td className="py-3 pr-4 font-mono text-xs text-slate-500 tabular-nums dark:text-slate-400">
                    {idx + 1}
                  </td>
                  <td className="py-3 pr-4 text-slate-900 dark:text-slate-100">
                    {row.alias}
                    {row.isCurrentUser && (
                      <span className="ml-2 text-xs font-medium text-teal-800 dark:text-teal-300">
                        · {isHi ? 'आपका परिवार' : 'Your household'}
                      </span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-right font-mono tabular-nums text-slate-900 dark:text-slate-100">
                    {row.weeklyActions}
                  </td>
                  <td className="py-3 pr-4 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                    ~{row.weeklyCo2SavedKg.toFixed(1)} kg
                  </td>
                  <td className="py-3 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                    {row.streakDays}d
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
