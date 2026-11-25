export type LanguageCode = 'en' | 'hi';

export type AqiBandKey =
  | 'good'
  | 'moderate'
  | 'sensitive'
  | 'unhealthy'
  | 'very_unhealthy'
  | 'severe';

export interface AqiBandInfo {
  key: AqiBandKey;
  min: number;
  max: number;
  labelEn: string;
  labelHi: string;
  meaningEn: string;
  meaningHi: string;
  symbol: 'circle' | 'half' | 'triangle' | 'shield' | 'octagon' | 'hazard';
  hex: string;
  badgeTextClass: string;
  surfaceTintClass: string;
  borderTintClass: string;
}

export interface HourlyForecastPoint {
  timeIso: string;
  hourLabel: string;
  aqi: number;
  pm25: number;
  pm10: number;
  temperatureC: number;
  humidityPct: number;
  windKmh: number;
}

export interface DailyHistoryPoint {
  dateIso: string; // YYYY-MM-DD
  dayLabel: string; // e.g. "Nov 19"
  weekdayLabel: string; // e.g. "Thu"
  avgAqi: number;
  maxAqi: number;
  minAqi: number;
  avgPm25: number;
  maxPm25: number;
  whoExceedanceRatio: number; // avgPm25 / 15 (WHO 24h PM2.5 guideline)
}

export interface AirQualitySnapshot {
  locationName: string;
  region: string;
  country: string;
  latitude: number;
  longitude: number;
  observedAtIso: string;
  source: 'open-meteo-live' | 'demo-seed';
  aqi: number;
  pm25: number;
  pm10: number;
  no2: number;
  o3: number;
  co: number; // in µg/m³ or mg/m³ normalized to mg/m³
  temperatureC: number;
  humidityPct: number;
  windKmh: number;
  inversionRisk: 'low' | 'moderate' | 'high';
  hourly: HourlyForecastPoint[];
  history7d?: DailyHistoryPoint[];
}

export type CommuteMode =
  | 'walk'
  | 'bike'
  | 'two_wheeler'
  | 'car'
  | 'public_transport'
  | 'wfh';

export type OutdoorExerciseHabit = 'none' | 'morning' | 'evening' | 'flexible';

export type MaskType = 'none' | 'cloth' | 'surgical' | 'n95' | 'n99' | 'kn95';

export type VentilationType =
  | 'sealed_ac'
  | 'standard_windows'
  | 'cross_ventilated'
  | 'balcony_open';

export type CookingFuelType =
  | 'lpg'
  | 'png_piped'
  | 'induction_electric'
  | 'biomass_solid';

export type BudgetLevel = 'low' | 'medium' | 'flexible';

export interface HouseholdProfile {
  displayLabel: string;
  city: string;
  latitude?: number;
  longitude?: number;
  language: LanguageCode;
  // Members (optional, privacy-respecting)
  hasChildren: boolean;
  hasElderly: boolean;
  hasPregnant: boolean;
  hasAsthmaOrRespiratory: boolean;
  hasHeartCondition: boolean;
  // Lifestyle
  commuteMode: CommuteMode;
  workFromHome: boolean;
  schoolGoingKids: boolean;
  outdoorExercise: OutdoorExerciseHabit;
  // Home
  hasAirPurifier: boolean;
  maskTypes: MaskType[];
  ventilationType: VentilationType;
  cookingFuel: CookingFuelType;
  hasIndoorPlants: boolean;
  budgetLevel: BudgetLevel;
  // Alerts & privacy
  alertAqiThreshold: number;
  healthConsentAccepted: boolean;
  communityGroupId: string;
}

export interface ImpactExplainer {
  pm25ExposureReduction: string;
  emissionsSaved: string;
  healthReasoning: string;
  assumptions: string;
  isApproximate: boolean;
}

export interface PlanRecommendationItem {
  id: string;
  title: string;
  timing: string;
  actionSteps: string[];
  whoItAppliesTo: string;
  impact: ImpactExplainer;
}

export interface MemberGuidance {
  memberGroup: string;
  riskLevel: 'low' | 'moderate' | 'high' | 'critical';
  maskRecommendation: string;
  outdoorLimit: string;
  specificAdvice: string;
}

export interface DailyPlanResponse {
  generatedAtIso: string;
  source: 'gemini-ai' | 'rule-fallback';
  fallbackNotice?: string;
  rightNowHeadline: string;
  rightNowSummary: string;
  bestOutdoorWindow: string;
  avoidOutdoorWindow: string;
  routine: PlanRecommendationItem[];
  indoorHacks: PlanRecommendationItem[];
  protectionGuidance: {
    summary: string;
    memberAdvice: MemberGuidance[];
    impact: ImpactExplainer;
  };
  sustainableAlternatives: PlanRecommendationItem[];
  medicalDisclaimer: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestampIso: string;
  source?: 'gemini-ai' | 'rule-fallback';
  groundedAqi?: number;
}

export type ActionCategory = 'protection' | 'indoor' | 'transport' | 'community';

export interface CleanAirActionOption {
  actionId: string;
  labelEn: string;
  labelHi: string;
  category: ActionCategory;
  pm25AvoidedUg: number;
  co2SavedKg: number;
  pmSavedGrams: number;
  assumptionEn: string;
  assumptionHi: string;
}

export interface ActionLogEntry {
  id: string;
  actionId: string;
  label: string;
  category: ActionCategory;
  pm25AvoidedUg: number;
  co2SavedKg: number;
  pmSavedGrams: number;
  dateKey: string; // YYYY-MM-DD
  createdAtIso: string;
}

export interface ImpactStats {
  weeklyActions: number;
  weeklyPm25AvoidedUg: number;
  weeklyCo2SavedKg: number;
  weeklyPmSavedGrams: number;
  streakDays: number;
  totalActions: number;
}

export interface CommunityLeaderboardEntry {
  id: string;
  alias: string;
  weeklyActions: number;
  weeklyCo2SavedKg: number;
  weeklyExposureAvoidedUg: number;
  streakDays: number;
  isCurrentUser?: boolean;
}

export interface CommunityGroupData {
  id: string;
  name: string;
  city: string;
  area: string;
  groupType: 'rwa' | 'school' | 'neighbourhood';
  challengeTitle: string;
  challengeTargetActions: number;
  tips: string[];
  leaderboard: CommunityLeaderboardEntry[];
}

export interface AirAlertItem {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  titleEn: string;
  titleHi: string;
  detailEn: string;
  detailHi: string;
  triggeredAtIso: string;
}
