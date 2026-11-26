/**
 * AirWise pure domain logic barrel.
 * Focused sub-modules live in lib/aqi-bands.ts, lib/impact-stats.ts,
 * lib/daily-plan-fallback.ts, and lib/history-analytics.ts.
 */
export {
  AQI_BANDS,
  computeInversionRisk,
  evaluateAlerts,
  findBestOutdoorWindows,
  getAqiBand,
  getEffectiveAlertThreshold,
  type WindowAnalysis,
} from './aqi-bands';

export {
  calculateImpactStats,
  detectPromptInjection,
  neutralizePromptDelimiters,
  sanitizeUserText,
} from './impact-stats';

export { buildRuleBasedDailyPlan } from './daily-plan-fallback';

export {
  aggregateHourlyToDailyHistory,
  aggregateHourlyToDailyRange,
  analyzeHistoryTrend,
  buildHistoryTooltipMetrics,
  computePresetDateRange,
  formatCalendarDateLabels,
  shiftDateIso,
  validateDateRange,
  type DateRangeValidationResult,
  type HistoryTooltipMetrics,
  type HistoryTrendSummary,
} from './history-analytics';
