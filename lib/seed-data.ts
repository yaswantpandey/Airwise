import type {
  ActionLogEntry,
  AirQualitySnapshot,
  CleanAirActionOption,
  CommunityGroupData,
  DailyHistoryPoint,
  HourlyForecastPoint,
  HouseholdProfile,
} from './types';
import { computeInversionRisk, formatCalendarDateLabels } from './air-quality';

export interface PresetCity {
  name: string;
  region: string;
  country: string;
  latitude: number;
  longitude: number;
  baseAqi: number;
  basePm25: number;
  basePm10: number;
  baseNo2: number;
  baseO3: number;
  baseCo: number;
  tempC: number;
  humidityPct: number;
  windKmh: number;
}

export const PRESET_CITIES: PresetCity[] = [
  {
    name: 'New Delhi',
    region: 'Delhi NCR',
    country: 'India',
    latitude: 28.6139,
    longitude: 77.209,
    baseAqi: 268,
    basePm25: 192,
    basePm10: 298,
    baseNo2: 68,
    baseO3: 38,
    baseCo: 1.9,
    tempC: 14,
    humidityPct: 76,
    windKmh: 4.8,
  },
  {
    name: 'Gurugram',
    region: 'Haryana',
    country: 'India',
    latitude: 28.4595,
    longitude: 77.0266,
    baseAqi: 244,
    basePm25: 171,
    basePm10: 274,
    baseNo2: 59,
    baseO3: 41,
    baseCo: 1.6,
    tempC: 15,
    humidityPct: 72,
    windKmh: 5.5,
  },
  {
    name: 'Noida',
    region: 'Uttar Pradesh',
    country: 'India',
    latitude: 28.5355,
    longitude: 77.391,
    baseAqi: 282,
    basePm25: 206,
    basePm10: 318,
    baseNo2: 72,
    baseO3: 34,
    baseCo: 2.1,
    tempC: 14,
    humidityPct: 78,
    windKmh: 4.2,
  },
  {
    name: 'Lucknow',
    region: 'Uttar Pradesh',
    country: 'India',
    latitude: 26.8467,
    longitude: 80.9462,
    baseAqi: 215,
    basePm25: 148,
    basePm10: 230,
    baseNo2: 46,
    baseO3: 44,
    baseCo: 1.4,
    tempC: 16,
    humidityPct: 71,
    windKmh: 6.1,
  },
  {
    name: 'Mumbai',
    region: 'Maharashtra',
    country: 'India',
    latitude: 19.076,
    longitude: 72.8777,
    baseAqi: 138,
    basePm25: 51,
    basePm10: 112,
    baseNo2: 39,
    baseO3: 56,
    baseCo: 0.9,
    tempC: 27,
    humidityPct: 68,
    windKmh: 13.4,
  },
  {
    name: 'Bengaluru',
    region: 'Karnataka',
    country: 'India',
    latitude: 12.9716,
    longitude: 77.5946,
    baseAqi: 76,
    basePm25: 24,
    basePm10: 54,
    baseNo2: 26,
    baseO3: 52,
    baseCo: 0.6,
    tempC: 23,
    humidityPct: 58,
    windKmh: 12.2,
  },
  {
    name: 'Kolkata',
    region: 'West Bengal',
    country: 'India',
    latitude: 22.5726,
    longitude: 88.3639,
    baseAqi: 186,
    basePm25: 114,
    basePm10: 188,
    baseNo2: 52,
    baseO3: 42,
    baseCo: 1.3,
    tempC: 21,
    humidityPct: 74,
    windKmh: 7.4,
  },
  {
    name: 'London',
    region: 'Greater London',
    country: 'United Kingdom',
    latitude: 51.5072,
    longitude: -0.1276,
    baseAqi: 42,
    basePm25: 10,
    basePm10: 18,
    baseNo2: 24,
    baseO3: 46,
    baseCo: 0.4,
    tempC: 9,
    humidityPct: 79,
    windKmh: 16.5,
  },
];

/**
 * Generates a realistic 48-hour diurnal winter smog curve (morning/night inversion peaks,
 * cleaner afternoon mixing window) so demo & offline modes are genuinely informative.
 */
export function buildSeedSnapshot(city: PresetCity): AirQualitySnapshot {
  const now = new Date();
  now.setMinutes(0, 0, 0);
  const hourly: HourlyForecastPoint[] = [];

  for (let h = 0; h < 48; h++) {
    const t = new Date(now.getTime() + h * 3600 * 1000);
    const hourOfDay = t.getHours();

    // Diurnal winter inversion factor: peaks at 06-09 and 21-01, dips at 13-16
    let factor = 1.0;
    if (hourOfDay >= 6 && hourOfDay <= 9) factor = 1.24;
    else if (hourOfDay >= 13 && hourOfDay <= 16) factor = 0.68;
    else if (hourOfDay >= 21 || hourOfDay <= 2) factor = 1.18;
    else if (hourOfDay >= 10 && hourOfDay <= 12) factor = 0.86;
    else factor = 0.94;

    // Day 2 gentle improvement trend
    const dayShift = h >= 24 ? 0.92 : 1.0;
    const aqi = Math.max(18, Math.round(city.baseAqi * factor * dayShift));
    const pm25 = Math.max(4, Math.round(city.basePm25 * factor * dayShift * 10) / 10);
    const pm10 = Math.max(8, Math.round(city.basePm10 * factor * dayShift * 10) / 10);
    const tempDelta = hourOfDay >= 12 && hourOfDay <= 16 ? 5 : hourOfDay <= 6 ? -3 : 0;
    const windDelta = hourOfDay >= 12 && hourOfDay <= 16 ? 4.5 : -1.2;

    hourly.push({
      timeIso: t.toISOString(),
      hourLabel: `${String(hourOfDay).padStart(2, '0')}:00`,
      aqi,
      pm25,
      pm10,
      temperatureC: Math.round((city.tempC + tempDelta) * 10) / 10,
      humidityPct: Math.max(25, Math.min(95, Math.round(city.humidityPct - tempDelta * 3))),
      windKmh: Math.max(2, Math.round((city.windKmh + windDelta) * 10) / 10),
    });
  }

  return {
    locationName: city.name,
    region: city.region,
    country: city.country,
    latitude: city.latitude,
    longitude: city.longitude,
    observedAtIso: new Date().toISOString(),
    source: 'demo-seed',
    aqi: city.baseAqi,
    pm25: city.basePm25,
    pm10: city.basePm10,
    no2: city.baseNo2,
    o3: city.baseO3,
    co: city.baseCo,
    temperatureC: city.tempC,
    humidityPct: city.humidityPct,
    windKmh: city.windKmh,
    inversionRisk: computeInversionRisk(city.basePm25, city.windKmh, city.humidityPct),
    hourly,
    history7d: buildSeedHistory7d(city.baseAqi, city.basePm25),
  };
}

/**
 * Generates a realistic 7-day air quality progression anchored to a city's baseline AQI & PM2.5
 * (reflecting a smog episode easing slightly over the past 3 days) for instant SSR & offline fallback.
 */
export function buildSeedHistory7d(baseAqi: number, basePm25: number): DailyHistoryPoint[] {
  const dailyFactors = [1.14, 1.22, 1.18, 1.09, 1.04, 0.96, 1.0];
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  return dailyFactors.map((factor, idx) => {
    const daysAgo = dailyFactors.length - 1 - idx;
    const dt = new Date(today.getTime() - daysAgo * 86_400_000);
    const dateIso = dt.toISOString().slice(0, 10);
    const { dayLabel, weekdayLabel } = formatCalendarDateLabels(dateIso);

    const avgAqi = Math.max(15, Math.round(baseAqi * factor));
    const maxAqi = Math.max(avgAqi + 12, Math.round(avgAqi * 1.24));
    const minAqi = Math.max(10, Math.round(avgAqi * 0.72));
    const avgPm25 = Math.max(3, Math.round(basePm25 * factor * 10) / 10);
    const maxPm25 = Math.round(avgPm25 * 1.28 * 10) / 10;

    return {
      dateIso,
      dayLabel,
      weekdayLabel,
      avgAqi,
      maxAqi,
      minAqi,
      avgPm25,
      maxPm25,
      whoExceedanceRatio: Math.round((avgPm25 / 15) * 10) / 10,
    };
  });
}

/**
 * Generates deterministic daily history across any [startDateIso, endDateIso] span (up to 90 days)
 * so custom and 14d/30d ranges remain informative even offline or when upstream archive is unreachable.
 */
export function buildSeedHistoryRange(
  baseAqi: number,
  basePm25: number,
  startDateIso: string,
  endDateIso: string
): DailyHistoryPoint[] {
  const [sy, sm, sd] = startDateIso.split('-').map(Number);
  const [ey, em, ed] = endDateIso.split('-').map(Number);
  const startMs = Date.UTC(sy, sm - 1, sd);
  const endMs = Date.UTC(ey, em - 1, ed);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || startMs > endMs) {
    return buildSeedHistory7d(baseAqi, basePm25);
  }

  const totalDays = Math.min(90, Math.round((endMs - startMs) / 86_400_000) + 1);
  const points: DailyHistoryPoint[] = [];

  for (let i = 0; i < totalDays; i++) {
    const dt = new Date(startMs + i * 86_400_000);
    const dateIso = dt.toISOString().slice(0, 10);
    const { dayLabel, weekdayLabel } = formatCalendarDateLabels(dateIso);

    // Smooth synoptic weather cycle + gentle recent easing
    const progress = totalDays > 1 ? i / (totalDays - 1) : 1;
    const wave = Math.sin(i * 0.85) * 0.14 + Math.cos(i * 0.35) * 0.08;
    const trendFactor = 1.12 - progress * 0.14;
    const factor = Math.max(0.55, Math.min(1.45, trendFactor + wave));

    const avgAqi = Math.max(15, Math.round(baseAqi * factor));
    const maxAqi = Math.max(avgAqi + 10, Math.round(avgAqi * 1.24));
    const minAqi = Math.max(10, Math.round(avgAqi * 0.72));
    const avgPm25 = Math.max(3, Math.round(basePm25 * factor * 10) / 10);
    const maxPm25 = Math.round(avgPm25 * 1.28 * 10) / 10;

    points.push({
      dateIso,
      dayLabel,
      weekdayLabel,
      avgAqi,
      maxAqi,
      minAqi,
      avgPm25,
      maxPm25,
      whoExceedanceRatio: Math.round((avgPm25 / 15) * 10) / 10,
    });
  }

  return points;
}

export const DEFAULT_HOUSEHOLD_PROFILE: HouseholdProfile = {
  displayLabel: 'My Household',
  city: 'New Delhi',
  latitude: 28.6139,
  longitude: 77.209,
  language: 'en',
  hasChildren: true,
  hasElderly: true,
  hasPregnant: false,
  hasAsthmaOrRespiratory: true,
  hasHeartCondition: false,
  commuteMode: 'car',
  workFromHome: false,
  schoolGoingKids: true,
  outdoorExercise: 'morning',
  hasAirPurifier: true,
  maskTypes: ['n95', 'surgical'],
  ventilationType: 'standard_windows',
  cookingFuel: 'png_piped',
  hasIndoorPlants: true,
  budgetLevel: 'medium',
  alertAqiThreshold: 150,
  healthConsentAccepted: true,
  communityGroupId: 'rwa-vasant-vihar',
};

export const CLEAN_AIR_ACTIONS: CleanAirActionOption[] = [
  {
    actionId: 'took-metro',
    labelEn: 'Took Metro / Public Transit',
    labelHi: 'मेट्रो / पब्लिक ट्रांसपोर्ट का उपयोग किया',
    category: 'transport',
    pm25AvoidedUg: 42,
    co2SavedKg: 2.4,
    pmSavedGrams: 0.8,
    assumptionEn: 'Approx. 15 km car round-trip replaced by electric metro/transit.',
    assumptionHi: 'अनुमानित: 15 किमी कार सफ़र की जगह मेट्रो/बस।',
  },
  {
    actionId: 'wore-n95',
    labelEn: 'Wore Fitted N95 / KN95 Mask Outdoors',
    labelHi: 'बाहर सही फिट वाला N95 / KN95 मास्क पहना',
    category: 'protection',
    pm25AvoidedUg: 95,
    co2SavedKg: 0,
    pmSavedGrams: 0,
    assumptionEn: 'Approx. 1 hr outdoors at PM2.5 ~120 µg/m³ with ~80% real-world N95 filtration.',
    assumptionHi: 'अनुमानित: ~120 µg/m³ PM2.5 में 1 घंटे बाहर N95 मास्क (~80% फ़िल्टर)।',
  },
  {
    actionId: 'ran-hepa',
    labelEn: 'Ran HEPA Purifier / Clean-Air Bedroom',
    labelHi: 'बेडरूम में HEPA एयर प्यूरीफ़ायर चलाया',
    category: 'indoor',
    pm25AvoidedUg: 140,
    co2SavedKg: 0,
    pmSavedGrams: 0,
    assumptionEn: 'Approx. 8 hrs overnight bedroom filtration reducing indoor PM2.5 by ~60%.',
    assumptionHi: 'अनुमानित: रात में 8 घंटे बंद बेडरूम में ~60% PM2.5 कमी।',
  },
  {
    actionId: 'carpooled-school',
    labelEn: 'Carpooled for School / Work',
    labelHi: 'स्कूल / ऑफ़िस के लिए कारपूल किया',
    category: 'transport',
    pm25AvoidedUg: 18,
    co2SavedKg: 1.8,
    pmSavedGrams: 0.6,
    assumptionEn: 'Approx. shared 12 km urban trip cutting per-household tailpipe emissions in half.',
    assumptionHi: 'अनुमानित: 12 किमी साझा यात्रा से उत्सर्जन आधा।',
  },
  {
    actionId: 'wet-mopped',
    labelEn: 'Wet-Mopped & Skipped Incense / Smoke',
    labelHi: 'गीला पोछा लगाया और धुआँ/अगरबत्ती से बचे',
    category: 'indoor',
    pm25AvoidedUg: 55,
    co2SavedKg: 0.1,
    pmSavedGrams: 0.3,
    assumptionEn: 'Approx. avoids re-suspending settled dust and eliminates indoor smoke spikes.',
    assumptionHi: 'अनुमानित: उड़ती धूल और घर के धुएँ की रोकथाम।',
  },
  {
    actionId: 'induction-covered',
    labelEn: 'Used Exhaust Fan & Electric / Covered Cooking',
    labelHi: 'एग्ज़ॉस्ट फ़ैन और ढँककर / इंडक्शन पर खाना पकाया',
    category: 'indoor',
    pm25AvoidedUg: 48,
    co2SavedKg: 0.5,
    pmSavedGrams: 0.2,
    assumptionEn: 'Approx. 45 min cooking with active ventilation and lower fuel burn.',
    assumptionHi: 'अनुमानित: 45 मिनट वेंटिलेटेड व कम-ईंधन कुकिंग।',
  },
  {
    actionId: 'reported-burning',
    labelEn: 'Composted Leaves / Reported Open Burning',
    labelHi: 'पत्ते कम्पोस्ट किए / कचरा जलाने की रिपोर्ट की',
    category: 'community',
    pm25AvoidedUg: 30,
    co2SavedKg: 3.1,
    pmSavedGrams: 18.0,
    assumptionEn: 'Approx. prevents ~5 kg dry leaf/waste open burning in residential lane.',
    assumptionHi: 'अनुमानित: ~5 किग्रा सूखे पत्ते/कचरा जलने से रोका।',
  },
];

function daysAgoKey(daysAgo: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

export function buildSeedActionLogs(): ActionLogEntry[] {
  return [
    {
      id: 'seed-log-1',
      actionId: 'ran-hepa',
      label: 'Ran HEPA Purifier / Clean-Air Bedroom',
      category: 'indoor',
      pm25AvoidedUg: 140,
      co2SavedKg: 0,
      pmSavedGrams: 0,
      dateKey: daysAgoKey(0),
      createdAtIso: new Date().toISOString(),
    },
    {
      id: 'seed-log-2',
      actionId: 'took-metro',
      label: 'Took Metro / Public Transit',
      category: 'transport',
      pm25AvoidedUg: 42,
      co2SavedKg: 2.4,
      pmSavedGrams: 0.8,
      dateKey: daysAgoKey(0),
      createdAtIso: new Date().toISOString(),
    },
    {
      id: 'seed-log-3',
      actionId: 'wore-n95',
      label: 'Wore Fitted N95 / KN95 Mask Outdoors',
      category: 'protection',
      pm25AvoidedUg: 95,
      co2SavedKg: 0,
      pmSavedGrams: 0,
      dateKey: daysAgoKey(1),
      createdAtIso: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 'seed-log-4',
      actionId: 'carpooled-school',
      label: 'Carpooled for School / Work',
      category: 'transport',
      pm25AvoidedUg: 18,
      co2SavedKg: 1.8,
      pmSavedGrams: 0.6,
      dateKey: daysAgoKey(2),
      createdAtIso: new Date(Date.now() - 172800000).toISOString(),
    },
    {
      id: 'seed-log-5',
      actionId: 'wet-mopped',
      label: 'Wet-Mopped & Skipped Incense / Smoke',
      category: 'indoor',
      pm25AvoidedUg: 55,
      co2SavedKg: 0.1,
      pmSavedGrams: 0.3,
      dateKey: daysAgoKey(3),
      createdAtIso: new Date(Date.now() - 259200000).toISOString(),
    },
  ];
}

export const SEED_COMMUNITY_GROUPS: CommunityGroupData[] = [
  {
    id: 'rwa-vasant-vihar',
    name: 'Vasant Vihar Clean Air RWA',
    city: 'New Delhi',
    area: 'South West Delhi',
    groupType: 'rwa',
    challengeTitle: 'Winter Smog Shield: 250 Low-Emission Trips & Zero Leaf Burning',
    challengeTargetActions: 250,
    tips: [
      'Security guards now receive electric room heaters instead of night bonfires.',
      'RWA sprinklers mist main arterial lanes at 7:30 AM before school buses arrive.',
      'Shared parent carpool sheet active for DPS, Sanskriti, and Vasant Valley routes.',
    ],
    leaderboard: [
      { id: 'c1', alias: 'Block B Cedar Home', weeklyActions: 19, weeklyCo2SavedKg: 18.4, weeklyExposureAvoidedUg: 1120, streakDays: 9 },
      { id: 'c2', alias: 'Parklane Terrace #14', weeklyActions: 16, weeklyCo2SavedKg: 14.2, weeklyExposureAvoidedUg: 940, streakDays: 7 },
      { id: 'c3', alias: 'Gulmohar Flat 402', weeklyActions: 14, weeklyCo2SavedKg: 11.8, weeklyExposureAvoidedUg: 880, streakDays: 6 },
      { id: 'c4', alias: 'South Gate Household', weeklyActions: 11, weeklyCo2SavedKg: 9.5, weeklyExposureAvoidedUg: 690, streakDays: 5 },
    ],
  },
  {
    id: 'school-greenfield-parents',
    name: 'Greenfield Public School Parents Circle',
    city: 'Gurugram',
    area: 'Sector 45–56',
    groupType: 'school',
    challengeTitle: 'No-Idling School Gate & Indoor Recess Readiness',
    challengeTargetActions: 180,
    tips: [
      'Parents turn off car engines during the 1:45 PM pickup queue along Gate 2.',
      'Classrooms run portable HEPA units whenever morning AQI crosses 200.',
      'Outdoor PT shifts to indoor yoga on Very Unhealthy & Severe days.',
    ],
    leaderboard: [
      { id: 's1', alias: 'Grade 4 Carpool Pod', weeklyActions: 17, weeklyCo2SavedKg: 21.0, weeklyExposureAvoidedUg: 830, streakDays: 8 },
      { id: 's2', alias: 'Sector 50 Family', weeklyActions: 13, weeklyCo2SavedKg: 12.6, weeklyExposureAvoidedUg: 760, streakDays: 5 },
      { id: 's3', alias: 'Aravalli View Home', weeklyActions: 10, weeklyCo2SavedKg: 8.9, weeklyExposureAvoidedUg: 640, streakDays: 4 },
    ],
  },
  {
    id: 'neighbourhood-indiranagar',
    name: 'Indiranagar Clean Commute Collective',
    city: 'Bengaluru',
    area: 'East Bengaluru',
    groupType: 'neighbourhood',
    challengeTitle: 'Metro First: 300 Shared & Rail Commutes This Week',
    challengeTargetActions: 300,
    tips: [
      'Purple Line feeder shuttle schedules shared daily for 100 Feet Road commuters.',
      'Local composting pits handle dry street leaves across 12th Main lanes.',
      'Evening runners check live PM2.5 before choosing inner park loops.',
    ],
    leaderboard: [
      { id: 'b1', alias: '12th Main Cyclists', weeklyActions: 22, weeklyCo2SavedKg: 24.5, weeklyExposureAvoidedUg: 540, streakDays: 12 },
      { id: 'b2', alias: 'CMH Metro Commuter', weeklyActions: 15, weeklyCo2SavedKg: 16.2, weeklyExposureAvoidedUg: 420, streakDays: 6 },
      { id: 'b3', alias: 'Defence Colony Flat', weeklyActions: 12, weeklyCo2SavedKg: 10.4, weeklyExposureAvoidedUg: 390, streakDays: 4 },
    ],
  },
];
